import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ApiError,
  clearToken,
  dataQuery,
  getToken,
  gql,
  saveToken,
  type Category,
  type Data,
  type Transaction,
  type User,
} from "./api";
import {
  Avatar,
  CategoryIcon,
  DateField,
  ErrorMessage,
  Field,
  Icon,
  Logo,
  Modal,
  PasswordField,
  Select,
  Tag,
  dateLabel,
  iconLabels,
  iconNames,
  money,
  palette,
  type Screen,
} from "./ui";

type DialogState =
  | { kind: "transaction"; item?: Transaction }
  | { kind: "category"; item?: Category }
  | {
      kind: "delete";
      item: Category | Transaction;
      entity: "category" | "transaction";
    }
  | null;
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente.";
function Auth({
  register = false,
  onLogin,
}: {
  register?: boolean;
  onLogin: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recover, setRecover] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const op = register ? "register" : "login";
      const result = await gql<Record<string, { token: string; user: User }>>(
        register
          ? "mutation($name:String!,$email:String!,$password:String!){register(name:$name,email:$email,password:$password){token user{id name email}}}"
          : "mutation($email:String!,$password:String!){login(email:$email,password:$password){token user{id name email}}}",
        {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        },
      );
      saveToken(result[op].token, form.get("remember") === "on");
      onLogin();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Logo screen={register ? "register" : "login"} />
      <section className="auth-card panel">
        <header className="auth-heading">
          <h1>{register ? "Criar conta" : "Fazer login"}</h1>
          <p>
            {register
              ? "Comece a controlar suas finanças ainda hoje"
              : "Entre na sua conta para continuar"}
          </p>
        </header>
        <form className="auth-form" onSubmit={submit}>
          <div className="fields">
            {register && (
              <Field
                label="Nome completo"
                name="name"
                screen="register"
                icon="imgIconUserRound"
                placeholder="Seu nome completo"
                autoComplete="name"
                required
                maxLength={100}
              />
            )}
            <Field
              label="E-mail"
              name="email"
              screen={register ? "register" : "login"}
              icon="imgIconMail"
              placeholder="mail@exemplo.com"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
            <PasswordField register={register} />
            {!register && (
              <div className="login-links">
                <label className="checkbox">
                  <input type="checkbox" name="remember" />
                  Lembrar-me
                </label>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setRecover(true)}
                >
                  Recuperar senha
                </button>
              </div>
            )}
          </div>
          <ErrorMessage error={error} />
          <button className="button primary" disabled={busy}>
            {busy ? "Aguarde…" : register ? "Cadastrar" : "Entrar"}
          </button>
          <div className="divider">
            <span />
            ou
            <span />
          </div>
          <div className="switch-auth">
            <p>{register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}</p>
            <Link
              className="button secondary"
              to={register ? "/" : "/cadastro"}
            >
              <Icon
                screen={register ? "register" : "login"}
                name={register ? "imgIconLogIn" : "imgIconUserRoundPlus"}
              />
              {register ? "Fazer login" : "Criar conta"}
            </Link>
          </div>
        </form>
      </section>
      {recover && (
        <Modal title="Recuperar senha" onClose={() => setRecover(false)}>
          <p className="muted">
            A recuperação de senha ainda não está disponível nesta versão.
          </p>
          <button className="button primary" onClick={() => setRecover(false)}>
            Voltar ao login
          </button>
        </Modal>
      )}
    </main>
  );
}
function Navbar({ user }: { user: User }) {
  const path = useLocation().pathname;
  const screen: Screen =
    path === "/categorias"
      ? "categories"
      : path === "/transacoes"
        ? "transactions"
        : path === "/perfil"
          ? "profile"
          : "dashboard";
  return (
    <header className="navbar">
      <div className="nav-container">
        <Link to="/" aria-label="Financy — Dashboard">
          <Logo screen={screen} />
        </Link>
        <nav aria-label="Menu principal">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/transacoes">Transações</NavLink>
          <NavLink to="/categorias">Categorias</NavLink>
        </nav>
        <Link to="/perfil" aria-label="Meu perfil">
          <Avatar name={user.name} />
        </Link>
      </div>
    </header>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}
function Dashboard({ data, onNew }: { data: Data; onNew: () => void }) {
  const now = new Date(),
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const income = data.transactions
      .filter((t) => t.type === "INCOME" && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0),
    expense = data.transactions
      .filter((t) => t.type === "EXPENSE" && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0);
  const balance = data.transactions.reduce(
    (s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount),
    0,
  );
  const categories = [...data.categories]
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 5);
  return (
    <main className="main dashboard">
      <div className="stats">
        {[
          ["Saldo total", balance, "imgIconWallet"],
          ["Receitas do mês", income, "imgIconCircleArrowUp"],
          ["Despesas do mês", expense, "imgIconCircleArrowDown"],
        ].map(([label, value, icon]) => (
          <section className="stat panel" key={String(label)}>
            <div className="eyebrow">
              <Icon screen="dashboard" name={String(icon)} />
              {label}
            </div>
            <strong>{money(Number(value))}</strong>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel recent">
          <header className="section-header">
            <h2 className="eyebrow">Transações recentes</h2>
            <Link className="text-button" to="/transacoes">
              Ver todas
              <Icon screen="dashboard" name="imgIconChevronRight" />
            </Link>
          </header>
          {data.transactions.length ? (
            data.transactions.slice(0, 5).map((t) => (
              <div className="recent-row" key={t.id}>
                <div className="transaction-description">
                  <CategoryIcon screen="dashboard" category={t.category} />
                  <div>
                    <p>{t.description}</p>
                    <small>{dateLabel(t.date)}</small>
                  </div>
                </div>
                <div className="recent-tag">
                  <Tag category={t.category} />
                </div>
                <div className="amount">
                  {t.type === "INCOME" ? "+" : "-"} {money(t.amount)}
                  <Icon
                    screen="dashboard"
                    name={
                      t.type === "INCOME"
                        ? "imgIconCircleArrowUp1"
                        : "imgIconCircleArrowDown1"
                    }
                  />
                </div>
              </div>
            ))
          ) : (
            <Empty>
              Você ainda não tem transações. Registre sua primeira receita ou
              despesa.
            </Empty>
          )}
          <button className="new-inline" onClick={onNew}>
            <Icon screen="dashboard" name="imgIconPlus" />
            Nova transação
          </button>
        </section>
        <section className="panel category-summary">
          <header className="section-header">
            <h2 className="eyebrow">Categorias</h2>
            <Link className="text-button" to="/categorias">
              Gerenciar
              <Icon screen="dashboard" name="imgIconChevronRight" />
            </Link>
          </header>
          <div className="summary-body">
            {categories.length ? (
              categories.map((c) => (
                <div className="summary-row" key={c.id}>
                  <Tag category={c} />
                  <span>
                    {c.transactionCount}{" "}
                    {c.transactionCount === 1 ? "item" : "itens"}
                  </span>
                  <strong>
                    {money(
                      data.transactions
                        .filter((t) => t.category?.id === c.id)
                        .reduce((s, t) => s + t.amount, 0),
                    )}
                  </strong>
                </div>
              ))
            ) : (
              <Empty>Crie categorias para organizar suas finanças.</Empty>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
function PageHeading({
  title,
  subtitle,
  label,
  onNew,
  screen,
}: {
  title: string;
  subtitle: string;
  label: string;
  onNew: () => void;
  screen: Screen;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <button className="button primary compact" onClick={onNew}>
        <Icon screen={screen} name="imgIconPlus" />
        {label}
      </button>
    </header>
  );
}
function Actions({
  screen,
  onDelete,
  onEdit,
  name,
}: {
  screen: Screen;
  onDelete: () => void;
  onEdit: () => void;
  name: string;
}) {
  return (
    <div className="actions">
      <button
        className="icon-button"
        aria-label={`Excluir ${name}`}
        onClick={onDelete}
      >
        <Icon
          screen={screen}
          name={
            screen === "categories" && name === "Salário"
              ? "imgIconTrash1"
              : "imgIconTrash"
          }
        />
      </button>
      <button
        className="icon-button"
        aria-label={`Editar ${name}`}
        onClick={onEdit}
      >
        <Icon screen={screen} name="imgIconSquarePen" />
      </button>
    </div>
  );
}
function Transactions({
  data,
  setDialog,
}: {
  data: Data;
  setDialog: (s: DialogState) => void;
}) {
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [category, setCategory] = useState(""),
    [month, setMonth] = useState(""),
    [page, setPage] = useState(1);
  const months = [...new Set(data.transactions.map((t) => t.date.slice(0, 7)))]
    .sort()
    .reverse();
  const filtered = data.transactions.filter(
    (t) =>
      (!search ||
        t.description
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR"))) &&
      (!type || t.type === type) &&
      (!category || t.category?.id === category) &&
      (!month || t.date.startsWith(month)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    currentPage = Math.min(page, pages),
    rows = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  useEffect(() => {
    setPage(1);
  }, [search, type, category, month]);
  return (
    <main className="main">
      <PageHeading
        title="Transações"
        subtitle="Gerencie todas as suas transações financeiras"
        label="Nova transação"
        screen="transactions"
        onNew={() => setDialog({ kind: "transaction" })}
      />
      <section className="filters panel" aria-label="Filtros de transações">
        <Field
          label="Buscar"
          icon="imgIconSearch"
          screen="transactions"
          placeholder="Buscar por descrição"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="INCOME">Entrada</option>
          <option value="EXPENSE">Saída</option>
        </Select>
        <Select
          label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Período"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">Todos os períodos</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(new Date(`${m}-01T12:00:00`))}
            </option>
          ))}
        </Select>
      </section>
      <section className="panel transaction-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Data</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="transaction-description">
                      <CategoryIcon
                        screen="transactions"
                        category={t.category}
                      />
                      <span>{t.description}</span>
                    </div>
                  </td>
                  <td>{dateLabel(t.date)}</td>
                  <td>
                    <Tag category={t.category} />
                  </td>
                  <td>
                    <span
                      className={`transaction-type ${t.type === "INCOME" ? "income" : "expense"}`}
                    >
                      <Icon
                        screen="transactions"
                        name={
                          t.type === "INCOME"
                            ? "imgIconCircleArrowUp"
                            : "imgIconCircleArrowDown"
                        }
                      />
                      {t.type === "INCOME" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="amount-cell">
                    {t.type === "INCOME" ? "+" : "-"} {money(t.amount)}
                  </td>
                  <td>
                    <Actions
                      screen="transactions"
                      name={t.description}
                      onDelete={() =>
                        setDialog({
                          kind: "delete",
                          entity: "transaction",
                          item: t,
                        })
                      }
                      onEdit={() => setDialog({ kind: "transaction", item: t })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty>
            {data.transactions.length
              ? "Nenhuma transação corresponde aos filtros."
              : "Você ainda não tem transações. Clique em Nova transação para começar."}
          </Empty>
        )}
        <footer className="pagination">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 8 + 1} a ${Math.min(currentPage * 8, filtered.length)} | ${filtered.length} resultados`
              : "0 resultados"}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <Icon screen="transactions" name="imgIconChevronLeft" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === pages || Math.abs(p - currentPage) <= 1,
              )
              .map((p) => (
                <button
                  className={`page-button ${p === currentPage ? "active" : ""}`}
                  aria-label={`Página ${p}`}
                  aria-current={p === currentPage ? "page" : undefined}
                  key={p}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button
              className="icon-button"
              aria-label="Próxima página"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <Icon screen="transactions" name="imgIconChevronRight" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
function Categories({
  data,
  setDialog,
}: {
  data: Data;
  setDialog: (s: DialogState) => void;
}) {
  const most = [...data.categories].sort(
    (a, b) => b.transactionCount - a.transactionCount,
  )[0];
  return (
    <main className="main">
      <PageHeading
        title="Categorias"
        subtitle="Organize suas transações por categorias"
        label="Nova categoria"
        screen="categories"
        onNew={() => setDialog({ kind: "category" })}
      />
      <div className="stats category-stats">
        <section className="panel">
          <Icon screen="categories" name="imgIconTag" />
          <div>
            <strong>{data.categories.length}</strong>
            <p className="eyebrow">Total de categorias</p>
          </div>
        </section>
        <section className="panel">
          <Icon screen="categories" name="imgIconArrowUpDown" />
          <div>
            <strong>{data.transactions.length}</strong>
            <p className="eyebrow">Total de transações</p>
          </div>
        </section>
        <section className="panel">
          <Icon
            screen="categories"
            name={most ? `imgIcon${most.icon}` : "imgIconUtensils"}
          />
          <div>
            <strong>{most?.transactionCount ? most.name : "—"}</strong>
            <p className="eyebrow">Categoria mais utilizada</p>
          </div>
        </section>
      </div>
      <div className="category-grid">
        {data.categories.map((c) => (
          <article className="panel category-card" key={c.id}>
            <header>
              <CategoryIcon screen="categories" category={c} />
              <Actions
                screen="categories"
                name={c.name}
                onDelete={() =>
                  setDialog({ kind: "delete", entity: "category", item: c })
                }
                onEdit={() => setDialog({ kind: "category", item: c })}
              />
            </header>
            <div className="category-copy">
              <h2>{c.name}</h2>
              <p>{c.description || "Sem descrição"}</p>
            </div>
            <footer>
              <Tag category={c} />
              <span>
                {c.transactionCount}{" "}
                {c.transactionCount === 1 ? "item" : "itens"}
              </span>
            </footer>
          </article>
        ))}
      </div>
      {!data.categories.length && (
        <section className="panel">
          <Empty>
            Você ainda não tem categorias. Crie uma para organizar suas
            transações.
          </Empty>
        </section>
      )}
    </main>
  );
}
function Profile({
  user,
  onSave,
  onLogout,
}: {
  user: User;
  onSave: () => Promise<void>;
  onLogout: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const name = new FormData(e.currentTarget).get("name");
    try {
      await gql("mutation($name:String!){updateProfile(name:$name){id}}", {
        name,
      });
      await onSave();
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="profile-page">
      <section className="panel auth-card profile-card">
        <header className="profile-heading">
          <Avatar name={user.name} large />
          <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </header>
        <hr />
        <form onSubmit={submit}>
          <div className="fields">
            <Field
              label="Nome completo"
              icon="imgIconUserRound"
              screen="profile"
              name="name"
              defaultValue={user.name}
              autoComplete="name"
              required
              maxLength={100}
            />
            <Field
              label="E-mail"
              icon="imgIconMail"
              screen="profile"
              value={user.email}
              disabled
              help="O e-mail não pode ser alterado"
            />
          </div>
          <ErrorMessage error={error} />
          {saved && (
            <p className="success" role="status">
              Alterações salvas.
            </p>
          )}
          <div className="profile-actions">
            <button className="button primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={onLogout}
            >
              <Icon screen="profile" name="imgIconLogOut" />
              Sair da conta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function TransactionForm({
  item,
  categories,
  onClose,
  onSave,
}: {
  item?: Transaction;
  categories: Category[];
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
      item?.type ?? "EXPENSE",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const raw = String(f.get("amount")).trim();
    const amount = Math.round(Number(raw.replace(",", ".")) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor positivo válido.");
      setBusy(false);
      return;
    }
    const input = {
      description: f.get("description"),
      date: f.get("date"),
      amount,
      type,
      categoryId: f.get("categoryId") || null,
    };
    try {
      await gql(
        item
          ? "mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id}}"
          : "mutation($input:TransactionInput!){createTransaction(input:$input){id}}",
        { id: item?.id, input },
      );
      await onSave();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item ? "Editar transação" : "Nova transação"}
      subtitle="Registre sua despesa ou receita"
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <div
          className="type-toggle"
          role="group"
          aria-label="Tipo de transação"
        >
          {(["EXPENSE", "INCOME"] as const).map((v) => (
            <button
              type="button"
              key={v}
              className={`${type === v ? "selected" : ""} ${v === "INCOME" ? "income" : "expense"}`}
              aria-pressed={type === v}
              onClick={() => setType(v)}
            >
              <Icon
                screen="transaction-modal"
                name={
                  v === "INCOME"
                    ? "imgIconCircleArrowUp"
                    : "imgIconCircleArrowDown"
                }
              />
              {v === "INCOME" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>
        <div className="fields">
          <Field
            label="Descrição"
            name="description"
            placeholder="Ex. Almoço no restaurante"
            defaultValue={item?.description}
            required
            maxLength={200}
          />
          <div className="two-fields">
            <DateField defaultValue={item?.date} />
            <Field
              label="Valor"
              screen="transaction-modal"
              icon="imgCurrency"
              name="amount"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={
                item
                  ? (item.amount / 100).toFixed(2).replace(".", ",")
                  : undefined
              }
              required
            />
          </div>
          <Select
            label="Categoria"
            screen="transaction-modal"
            name="categoryId"
            defaultValue={item?.category?.id ?? ""}
          >
            <option value="">Selecione</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {!categories.length && (
            <small className="muted">
              Você pode salvar sem categoria e organizá-la depois.
            </small>
          )}
        </div>
        <ErrorMessage error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}
function CategoryForm({
  item,
  onClose,
  onSave,
}: {
  item?: Category;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [icon, setIcon] = useState(item?.icon ?? "BriefcaseBusiness"),
    [color, setColor] = useState(item?.color ?? "green"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await gql(
        item
          ? "mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){id}}"
          : "mutation($input:CategoryInput!){createCategory(input:$input){id}}",
        {
          id: item?.id,
          input: {
            name: f.get("name"),
            description: f.get("description"),
            color,
            icon,
          },
        },
      );
      await onSave();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item ? "Editar categoria" : "Nova categoria"}
      subtitle="Organize suas transações com categorias"
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <div className="fields">
          <Field
            label="Título"
            name="name"
            placeholder="Ex. Alimentação"
            defaultValue={item?.name}
            required
            maxLength={60}
          />
          <Field
            label="Descrição"
            name="description"
            placeholder="Descrição da categoria"
            defaultValue={item?.description}
            help="Opcional"
            maxLength={300}
          />
          <fieldset className="chooser">
            <legend>Ícone</legend>
            <div className="icon-grid">
              {iconNames.map((name, i) => (
                <button
                  className={`icon-choice ${icon === name ? "selected" : ""}`}
                  key={name}
                  type="button"
                  aria-label={iconLabels[i]}
                  aria-pressed={icon === name}
                  onClick={() => setIcon(name)}
                >
                  <Icon screen="category-modal" name={`imgIcon${name}`} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="chooser">
            <legend>Cor</legend>
            <div className="color-grid">
              {Object.entries(palette).map(([name, c]) => (
                <button
                  key={name}
                  type="button"
                  className={`color-choice ${name === color ? "selected" : ""}`}
                  aria-label={
                    {
                      green: "Verde",
                      blue: "Azul",
                      purple: "Roxo",
                      pink: "Rosa",
                      red: "Vermelho",
                      orange: "Laranja",
                      yellow: "Amarelo",
                    }[name]
                  }
                  aria-pressed={name === color}
                  onClick={() => setColor(name)}
                >
                  <span style={{ background: c.base }} />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <ErrorMessage error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}
function DeleteDialog({
  state,
  onClose,
  onSave,
}: {
  state: Extract<DialogState, { kind: "delete" }>;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await gql(
        state.entity === "category"
          ? "mutation($id:ID!){deleteCategory(id:$id)}"
          : "mutation($id:ID!){deleteTransaction(id:$id)}",
        { id: state.item.id },
      );
      await onSave();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        state.entity === "category" ? "Excluir categoria" : "Excluir transação"
      }
      onClose={onClose}
    >
      <p className="muted">
        Deseja excluir “
        {"name" in state.item ? state.item.name : state.item.description}”?
        {state.entity === "category"
          ? " As transações serão preservadas e ficarão sem categoria."
          : " Esta ação não pode ser desfeita."}
      </p>
      <ErrorMessage error={error} />
      <div className="two-fields">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button
          className="button danger"
          onClick={() => void remove()}
          disabled={busy}
        >
          {busy ? "Excluindo…" : "Excluir"}
        </button>
      </div>
    </Modal>
  );
}

export function App() {
  const [data, setData] = useState<Data | null>(null),
    [token, setToken] = useState(getToken()),
    [loading, setLoading] = useState(Boolean(getToken())),
    [error, setError] = useState(""),
    [dialog, setDialog] = useState<DialogState>(null);
  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setData(null);
    setDialog(null);
    setError("");
  }, []);
  const refresh = useCallback(async () => {
    try {
      setData(await gql<Data>(dataQuery));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHENTICATED") {
        logout();
      } else throw e;
    }
  }, [logout]);
  useEffect(() => {
    let alive = true;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh()
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, refresh]);
  if (loading)
    return (
      <main className="loading" role="status">
        <Logo />
        <p>Carregando suas finanças…</p>
      </main>
    );
  if (!token)
    return (
      <Routes>
        <Route
          path="/cadastro"
          element={<Auth register onLogin={() => setToken(getToken())} />}
        />
        <Route
          path="/"
          element={<Auth onLogin={() => setToken(getToken())} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  if (!data)
    return (
      <main className="loading">
        <Logo />
        <ErrorMessage error={error} />
        <button
          className="button primary"
          onClick={() => {
            setLoading(true);
            refresh()
              .catch((e) => setError(errorText(e)))
              .finally(() => setLoading(false));
          }}
        >
          Tentar novamente
        </button>
        <button className="text-button" onClick={logout}>
          Voltar ao login
        </button>
      </main>
    );
  return (
    <>
      <Navbar user={data.me} />
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              data={data}
              onNew={() => setDialog({ kind: "transaction" })}
            />
          }
        />
        <Route
          path="/transacoes"
          element={<Transactions data={data} setDialog={setDialog} />}
        />
        <Route
          path="/categorias"
          element={<Categories data={data} setDialog={setDialog} />}
        />
        <Route
          path="/perfil"
          element={
            <Profile user={data.me} onSave={refresh} onLogout={logout} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {dialog?.kind === "transaction" && (
        <TransactionForm
          item={dialog.item}
          categories={data.categories}
          onClose={() => setDialog(null)}
          onSave={refresh}
        />
      )}{" "}
      {dialog?.kind === "category" && (
        <CategoryForm
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSave={refresh}
        />
      )}{" "}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onSave={refresh}
        />
      )}
    </>
  );
}
