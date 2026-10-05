import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../dist/app.js";
const parent = resolve("test-results");
mkdirSync(parent, { recursive: true });
const folder = mkdtempSync(`${parent}/api-`),
  path = resolve(folder, "test.db");
const sqlite = new DatabaseSync(path);
sqlite.exec(
  readFileSync("prisma/migrations/202610050001_init/migration.sql", "utf8"),
);
sqlite.close();
const db = new PrismaClient({
  datasources: { db: { url: `file:${path.replaceAll("\\", "/")}` } },
});
const app = createApp(db, "test-secret-is-long-enough-for-hs256-testing");
async function request(query, variables = {}, token) {
  const response = await app.fetch(
    new Request("http://localhost/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    }),
  );
  return response.json();
}
const register =
  "mutation($name:String!,$email:String!,$password:String!){register(name:$name,email:$email,password:$password){token user{id email}}}";
const catCreate =
  "mutation($input:CategoryInput!){createCategory(input:$input){id name}}";
const txnCreate =
  "mutation($input:TransactionInput!){createTransaction(input:$input){id amount category{id}}}";
let a, b, categoryId, transactionId;
before(async () => {
  a = (
    await request(register, {
      name: "Conta A",
      email: "A@example.com",
      password: "senha-segura",
    })
  ).data.register;
  b = (
    await request(register, {
      name: "Conta B",
      email: "b@example.com",
      password: "senha-segura",
    })
  ).data.register;
});
after(async () => {
  await db.$disconnect();
});
test("autenticação, normalização de e-mail e proteção das consultas", async () => {
  assert.equal(a.user.email, "a@example.com");
  const denied = await request("{me{id} categories{id} transactions{id}}");
  assert.equal(denied.errors[0].extensions.code, "UNAUTHENTICATED");
  const login = await request(
    "mutation($email:String!,$password:String!){login(email:$email,password:$password){token}}",
    { email: "A@example.com", password: "senha-segura" },
  );
  assert.ok(login.data.login.token);
  const bad = await request(
    'mutation{login(email:"a@example.com",password:"errada"){token}}',
  );
  assert.match(bad.errors[0].message, /incorretos/);
  const duplicate = await request(register, {
    name: "Duplicada",
    email: "a@example.com",
    password: "senha-segura",
  });
  assert.match(duplicate.errors[0].message, /cadastrado/);
});
test("criar, listar e editar categoria, mantendo dados privados por usuário", async () => {
  const created = await request(
    catCreate,
    { input: { name: "Alimentação", color: "blue", icon: "Utensils" } },
    a.token,
  );
  categoryId = created.data.createCategory.id;
  const updated = await request(
    "mutation($id:ID!,$input:CategoryInput!){updateCategory(id:$id,input:$input){name description}}",
    {
      id: categoryId,
      input: {
        name: "Refeições",
        description: "Almoço",
        color: "blue",
        icon: "Utensils",
      },
    },
    a.token,
  );
  assert.equal(updated.data.updateCategory.name, "Refeições");
  assert.deepEqual(
    (await request("{categories{id}}", {}, b.token)).data.categories,
    [],
  );
  const denied = await request(
    "mutation($id:ID!){deleteCategory(id:$id)}",
    { id: categoryId },
    b.token,
  );
  assert.match(denied.errors[0].message, /não encontrada/);
  const bad = await request(
    catCreate,
    { input: { name: "Inválida", color: "x", icon: "x" } },
    a.token,
  );
  assert.ok(bad.errors);
});
test("validar valor, data e categoria pertencente à conta", async () => {
  const base = {
    description: "Teste",
    amount: 1500,
    date: "2026-10-05",
    type: "EXPENSE",
    categoryId,
  };
  for (const input of [
    { ...base, amount: -1 },
    { ...base, date: "2026-02-30" },
  ])
    assert.ok((await request(txnCreate, { input }, a.token)).errors);
  assert.ok((await request(txnCreate, { input: base }, b.token)).errors);
});
test("criar, editar e listar transações, impedindo acesso entre contas", async () => {
  const input = {
    description: "Almoço",
    amount: 1550,
    date: "2026-10-05",
    type: "EXPENSE",
    categoryId,
  };
  const created = await request(txnCreate, { input }, a.token);
  transactionId = created.data.createTransaction.id;
  assert.equal(created.data.createTransaction.amount, 1550);
  const edited = await request(
    "mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){description amount type}}",
    {
      id: transactionId,
      input: { ...input, description: "Jantar", amount: 2000, type: "INCOME" },
    },
    a.token,
  );
  assert.equal(edited.data.updateTransaction.amount, 2000);
  const denied = await request(
    "mutation($id:ID!,$input:TransactionInput!){updateTransaction(id:$id,input:$input){id}}",
    { id: transactionId, input },
    b.token,
  );
  assert.ok(denied.errors);
  assert.deepEqual(
    (await request("{transactions{id}}", {}, b.token)).data.transactions,
    [],
  );
  assert.equal(
    (await request("{categories{transactionCount}}", {}, a.token)).data
      .categories[0].transactionCount,
    1,
  );
});
test("exclusão de categoria preserva as transações; exclusão de transação é privada", async () => {
  assert.equal(
    (
      await request(
        "mutation($id:ID!){deleteCategory(id:$id)}",
        { id: categoryId },
        a.token,
      )
    ).data.deleteCategory,
    true,
  );
  const kept = await request("{transactions{id category{id}}}", {}, a.token);
  assert.equal(kept.data.transactions[0].category, null);
  assert.ok(
    (
      await request(
        "mutation($id:ID!){deleteTransaction(id:$id)}",
        { id: transactionId },
        b.token,
      )
    ).errors,
  );
  assert.equal(
    (
      await request(
        "mutation($id:ID!){deleteTransaction(id:$id)}",
        { id: transactionId },
        a.token,
      )
    ).data.deleteTransaction,
    true,
  );
  assert.deepEqual(
    (await request("{transactions{id}}", {}, a.token)).data.transactions,
    [],
  );
});
test("editar perfil sem expor o hash da senha", async () => {
  const result = await request(
    'mutation{updateProfile(name:"Novo nome"){name email}}',
    {},
    a.token,
  );
  assert.equal(result.data.updateProfile.name, "Novo nome");
  assert.ok((await request("{me{passwordHash}}", {}, a.token)).errors);
});
