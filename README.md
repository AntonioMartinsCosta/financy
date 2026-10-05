# Financy

Aplicação de organização de finanças.

## Executar localmente

Requisitos: Node.js 22.12 ou superior e pnpm 11.

```sh
pnpm install
pnpm run setup
pnpm dev
```

Abra http://127.0.0.1:5173. A API GraphQL fica em http://127.0.0.1:4000/graphql.

O comando `pnpm run setup` cria os arquivos `.env` a partir dos exemplos, gera um segredo JWT aleatório, prepara o arquivo SQLite e aplica as migrações. Arquivos `.env` existentes são preservados. Não versione segredos nem bancos locais.

Para uma conta de demonstração opcional:

```sh
pnpm --dir backend db:seed
```

Login: `conta@teste.com`. Senha: `Financy123!`. A demonstração usa transações de novembro/dezembro de 2025, como o Figma; os cartões mensais calculam o mês atual. Novas contas começam sem dados. Executar o seed novamente preserva a conta existente.

## Implementação

- `frontend`: React, TypeScript, Vite, React Router e CSS com tokens do Style Guide. Fontes Inter e todos os SVGs usados ficam locais.
- `backend`: TypeScript, GraphQL Yoga, Prisma e SQLite. Valores monetários são armazenados em centavos. Senhas usam scrypt com salt; JWTs expiram em sete dias.
- Cadastro, login, lembrar sessão, dashboard com saldo e totais mensais, transações com busca/filtros/paginação, categorias com seleção de ícone/cor, edição de perfil e logout.
- Consultas e alterações validam a propriedade dos dados. Remover uma categoria preserva suas transações, que ficam sem categoria.
- Estados vazios, mensagens de erro, confirmação de exclusão e diálogos acessíveis com foco e fechamento por Escape. Layout adaptado para telas menores.

As seis telas principais do Figma e os dois modais foram implementados. A recuperação de senha não faz parte dos requisitos e permanece indisponível, com mensagem explícita ao clicar no link. Upload de avatar não foi incluído.

## Configuração

Consulte `backend/.env.example` e `frontend/.env.example`. A configuração padrão atende a execução local. Em produção, configure o domínio permitido no CORS, o endereço da API, um segredo privado e HTTPS; o servidor local escuta apenas em `127.0.0.1`.

## Verificar

```sh
pnpm build
pnpm test
```

Os testes usam um banco SQLite separado em `backend/test-results`, sem modificar o banco da aplicação. Verificam autenticação, CRUD, validação, isolamento entre contas e preservação de transações ao excluir categorias.

As consultas/mutações disponíveis podem ser exploradas na interface GraphQL da API em desenvolvimento.
