import { createSchema, createYoga } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { PrismaClient } from "@prisma/client";
import { checkPassword, hashPassword, readToken, signToken } from "./auth.js";

export const colors = [
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
];
export const icons = [
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
type Context = { userId: string | null };
type CategoryInput = {
  name: string;
  description?: string;
  color: string;
  icon: string;
};
type TransactionInput = {
  description: string;
  amount: number;
  date: string;
  type: string;
  categoryId?: string | null;
};
function fail(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}
function requireUser(context: Context) {
  if (!context.userId)
    throw new GraphQLError("Faça login para continuar.", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  return context.userId;
}
function text(value: string, label: string, max = 200) {
  if (!value?.trim() || value.trim().length > max)
    fail(`${label} deve ter entre 1 e ${max} caracteres.`);
  return value.trim();
}
function email(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254)
    fail("Informe um e-mail válido.");
  return normalized;
}
function categoryData(input: CategoryInput) {
  if (!colors.includes(input.color) || !icons.includes(input.icon))
    fail("Selecione uma cor e um ícone válidos.");
  if ((input.description ?? "").length > 300) fail("Descrição muito longa.");
  return {
    ...input,
    name: text(input.name, "Título", 60),
    description: input.description?.trim() ?? "",
  };
}
function transactionData(input: TransactionInput) {
  if (
    !Number.isInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > 2147483647
  )
    fail("Informe um valor positivo válido.");
  if (!["INCOME", "EXPENSE"].includes(input.type))
    fail("Tipo de transação inválido.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    fail("Informe uma data válida.");
  return {
    ...input,
    description: text(input.description, "Descrição"),
    categoryId: input.categoryId || null,
  };
}

export function createApp(
  db: PrismaClient,
  secret: string,
  origin = "http://127.0.0.1:5173",
) {
  async function ownedCategory(id: string, userId: string) {
    const item = await db.category.findFirst({ where: { id, userId } });
    if (!item) fail("Categoria não encontrada.");
    return item;
  }
  async function ownedTransaction(id: string, userId: string) {
    const item = await db.transaction.findFirst({ where: { id, userId } });
    if (!item) fail("Transação não encontrada.");
    return item;
  }
  async function validateCategory(
    id: string | null | undefined,
    userId: string,
  ) {
    if (id) await ownedCategory(id, userId);
  }
  return createYoga({
    graphqlEndpoint: "/graphql",
    graphiql: process.env.NODE_ENV !== "production",
    cors: {
      origin: [origin, "http://localhost:5173"],
      methods: ["POST", "GET", "OPTIONS"],
    },
    context: ({ request }) => ({
      userId: readToken(request.headers.get("authorization"), secret),
    }),
    schema: createSchema({
      typeDefs: `
      type User { id:ID! name:String! email:String! }
      type AuthPayload { token:String! user:User! }
      type Category { id:ID! name:String! description:String! color:String! icon:String! transactionCount:Int! }
      enum TransactionType { INCOME EXPENSE }
      type Transaction { id:ID! description:String! amount:Int! date:String! type:TransactionType! category:Category }
      input CategoryInput { name:String! description:String color:String! icon:String! }
      input TransactionInput { description:String! amount:Int! date:String! type:TransactionType! categoryId:ID }
      type Query { me:User! categories:[Category!]! transactions:[Transaction!]! }
      type Mutation {
        register(name:String!,email:String!,password:String!):AuthPayload!
        login(email:String!,password:String!):AuthPayload!
        updateProfile(name:String!):User!
        createCategory(input:CategoryInput!):Category!
        updateCategory(id:ID!,input:CategoryInput!):Category!
        deleteCategory(id:ID!):Boolean!
        createTransaction(input:TransactionInput!):Transaction!
        updateTransaction(id:ID!,input:TransactionInput!):Transaction!
        deleteTransaction(id:ID!):Boolean!
      }
    `,
      resolvers: {
        Query: {
          me: async (_: unknown, __: {}, ctx: Context) => {
            const user = await db.user.findUnique({
              where: { id: requireUser(ctx) },
            });
            if (!user) fail("Conta não encontrada.");
            return user;
          },
          categories: (_: unknown, __: {}, ctx: Context) =>
            db.category.findMany({
              where: { userId: requireUser(ctx) },
              orderBy: { name: "asc" },
            }),
          transactions: (_: unknown, __: {}, ctx: Context) =>
            db.transaction.findMany({
              where: { userId: requireUser(ctx) },
              orderBy: [{ date: "desc" }, { id: "desc" }],
              include: { category: true },
            }),
        },
        Category: {
          transactionCount: (parent: { id: string; userId: string }) =>
            db.transaction.count({
              where: { categoryId: parent.id, userId: parent.userId },
            }),
        },
        Mutation: {
          register: async (
            _: unknown,
            args: { name: string; email: string; password: string },
          ) => {
            const name = text(args.name, "Nome", 100),
              normalized = email(args.email);
            if (args.password.length < 8 || args.password.length > 128)
              fail("A senha deve ter entre 8 e 128 caracteres.");
            try {
              const user = await db.user.create({
                data: {
                  name,
                  email: normalized,
                  passwordHash: hashPassword(args.password),
                },
              });
              return { user, token: signToken(user.id, secret) };
            } catch (e) {
              if (
                e &&
                typeof e === "object" &&
                "code" in e &&
                e.code === "P2002"
              )
                fail("Este e-mail já está cadastrado.");
              throw e;
            }
          },
          login: async (
            _: unknown,
            args: { email: string; password: string },
          ) => {
            if (args.password.length > 128) fail("E-mail ou senha incorretos.");
            const user = await db.user.findUnique({
              where: { email: email(args.email) },
            });
            if (!user || !checkPassword(args.password, user.passwordHash))
              fail("E-mail ou senha incorretos.");
            return { user, token: signToken(user.id, secret) };
          },
          updateProfile: (_: unknown, args: { name: string }, ctx: Context) =>
            db.user.update({
              where: { id: requireUser(ctx) },
              data: { name: text(args.name, "Nome", 100) },
            }),
          createCategory: async (
            _: unknown,
            args: { input: CategoryInput },
            ctx: Context,
          ) => {
            const userId = requireUser(ctx);
            const data = categoryData(args.input);
            if (
              await db.category.findFirst({
                where: { userId, name: data.name },
              })
            )
              fail("Já existe uma categoria com esse título.");
            return db.category.create({ data: { ...data, userId } });
          },
          updateCategory: async (
            _: unknown,
            args: { id: string; input: CategoryInput },
            ctx: Context,
          ) => {
            const userId = requireUser(ctx);
            await ownedCategory(args.id, userId);
            const data = categoryData(args.input);
            if (
              await db.category.findFirst({
                where: { userId, name: data.name, id: { not: args.id } },
              })
            )
              fail("Já existe uma categoria com esse título.");
            return db.category.update({ where: { id: args.id }, data });
          },
          deleteCategory: async (
            _: unknown,
            args: { id: string },
            ctx: Context,
          ) => {
            await ownedCategory(args.id, requireUser(ctx));
            await db.category.delete({ where: { id: args.id } });
            return true;
          },
          createTransaction: async (
            _: unknown,
            args: { input: TransactionInput },
            ctx: Context,
          ) => {
            const userId = requireUser(ctx);
            const data = transactionData(args.input);
            await validateCategory(data.categoryId, userId);
            return db.transaction.create({
              data: { ...data, userId },
              include: { category: true },
            });
          },
          updateTransaction: async (
            _: unknown,
            args: { id: string; input: TransactionInput },
            ctx: Context,
          ) => {
            const userId = requireUser(ctx);
            await ownedTransaction(args.id, userId);
            const data = transactionData(args.input);
            await validateCategory(data.categoryId, userId);
            return db.transaction.update({
              where: { id: args.id },
              data,
              include: { category: true },
            });
          },
          deleteTransaction: async (
            _: unknown,
            args: { id: string },
            ctx: Context,
          ) => {
            await ownedTransaction(args.id, requireUser(ctx));
            await db.transaction.delete({ where: { id: args.id } });
            return true;
          },
        },
      },
    }),
  });
}
