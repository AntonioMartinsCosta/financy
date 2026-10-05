import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import assets from "./assets.json";
export type Screen = keyof typeof assets;
export const palette: Record<
  string,
  { base: string; light: string; dark: string }
> = {
  green: { base: "#16a34a", light: "#e0fae9", dark: "#15803d" },
  blue: { base: "#2563eb", light: "#dbeafe", dark: "#1d4ed8" },
  purple: { base: "#9333ea", light: "#f3e8ff", dark: "#7e22ce" },
  pink: { base: "#db2777", light: "#fce7f3", dark: "#be185d" },
  red: { base: "#dc2626", light: "#fee2e2", dark: "#b91c1c" },
  orange: { base: "#ea580c", light: "#ffedd5", dark: "#c2410c" },
  yellow: { base: "#ca8a04", light: "#f7f3ca", dark: "#a16207" },
};
export const iconNames = [
  "BriefcaseBusiness",
  "CarFront",
  "HeartPulse",
  "PiggyBank",
  "ShoppingCart",
  "Ticket",
  "ToolCase",
  "Utensils",
  "PawPrint",
  "House",
  "Gift",
  "Dumbbell",
  "BookOpen",
  "BaggageClaim",
  "Mailbox",
  "ReceiptText",
];
export const iconLabels = [
  "Trabalho",
  "Transporte",
  "Saúde",
  "Investimento",
  "Compras",
  "Entretenimento",
  "Utilidades",
  "Alimentação",
  "Animais",
  "Casa",
  "Presentes",
  "Academia",
  "Estudos",
  "Viagem",
  "Correspondência",
  "Outros",
];
export function Icon({ screen, name }: { screen: Screen; name: string }) {
  const source =
    (assets[screen] as Record<string, string>)[name] ??
    (assets["category-modal"] as Record<string, string>)[name];
  return source ? <img className="icon" src={source} alt="" /> : null;
}
export function Logo({ screen = "login" }: { screen?: Screen }) {
  return (
    <img
      className="logo"
      src={
        (assets[screen] as Record<string, string>).imgLogo ??
        assets.login.imgLogo
      }
      alt="Financy"
    />
  );
}
export const money = (amount: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    amount / 100,
  );
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T12:00:00`));
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`}>
      {name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((v) => v[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}
export function Tag({
  category,
  label,
}: {
  category: { name: string; color: string } | null;
  label?: string;
}) {
  const c = palette[category?.color ?? "green"] ?? palette.green;
  return (
    <span className="tag" style={{ background: c.light, color: c.dark }}>
      {label ?? category?.name ?? "Sem categoria"}
    </span>
  );
}
export function CategoryIcon({
  category,
  screen,
}: {
  category: { icon: string; color: string } | null;
  screen: Screen;
}) {
  const c = palette[category?.color ?? "green"] ?? palette.green;
  const name = category?.icon ?? "ReceiptText";
  return (
    <span className="category-icon" style={{ background: c.light }}>
      <Icon
        screen={screen}
        name={`imgIcon${name}${screen === "categories" && name === "Utensils" ? "1" : ""}`}
      />
    </span>
  );
}
export function Field({
  label,
  icon,
  screen = "login",
  help,
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: string;
  screen?: Screen;
  help?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="control">
        {icon && <Icon screen={screen} name={icon} />}
        <input
          id={id}
          aria-describedby={help ? `${id}-help` : undefined}
          {...props}
        />
        {children}
      </span>
      {help && <small id={`${id}-help`}>{help}</small>}
    </div>
  );
}
export function PasswordField({ register = false }: { register?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label="Senha"
      name="password"
      icon="imgIconLock"
      screen={register ? "register" : "login"}
      type={visible ? "text" : "password"}
      placeholder="Digite sua senha"
      autoComplete={register ? "new-password" : "current-password"}
      required
      minLength={register ? 8 : undefined}
      maxLength={128}
      help={register ? "A senha deve ter no mínimo 8 caracteres" : undefined}
    >
      <button
        className="bare eye"
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <Icon
          screen={register ? "register" : "login"}
          name="imgIconEyeClosed"
        />
      </button>
    </Field>
  );
}
export function Select({
  label,
  screen = "transactions",
  children,
  ...props
}: {
  label: string;
  screen?: Screen;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const [selected, setSelected] = useState(props.defaultValue ?? "");
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="control select">
        <select
          {...props}
          id={id}
          className={
            screen === "transaction-modal" && !(props.value ?? selected)
              ? "placeholder"
              : ""
          }
          onChange={(e) => {
            setSelected(e.target.value);
            props.onChange?.(e);
          }}
        >
          {children}
        </select>
        <Icon screen={screen} name="imgIconChevronDown" />
      </span>
    </div>
  );
}
export function DateField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <Field
      label="Data"
      name="date"
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={!value ? "date-empty" : ""}
      required
    >
      {!value && <span className="date-placeholder">Selecione</span>}
    </Field>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const screen = title.includes("categoria")
    ? "category-modal"
    : "transaction-modal";
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="modal-header">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <Icon screen={screen} name="imgIconX" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
