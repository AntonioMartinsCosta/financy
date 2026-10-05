import "dotenv/config";
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app.js";
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    "Configure JWT_SECRET com pelo menos 32 caracteres. Execute pnpm setup.",
  );
const db = new PrismaClient();
const server = createServer(createApp(db, secret, process.env.FRONTEND_URL));
server.listen(Number(process.env.PORT ?? 4000), "127.0.0.1", () =>
  console.log(
    `API Financy disponível em http://127.0.0.1:${process.env.PORT ?? 4000}/graphql`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
