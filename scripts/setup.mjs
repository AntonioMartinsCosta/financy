import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  openSync,
  closeSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { randomBytes } from "node:crypto";
for (const folder of ["backend", "frontend"]) {
  if (!existsSync(`${folder}/.env`))
    writeFileSync(
      `${folder}/.env`,
      readFileSync(`${folder}/.env.example`, "utf8").replace(
        "JWT_SECRET=",
        `JWT_SECRET=${randomBytes(48).toString("hex")}`,
      ),
    );
}
// Create an empty SQLite file before Prisma's first deployment.
const dbUrl =
  process.env.DATABASE_URL ??
  readFileSync("backend/.env", "utf8")
    .match(/^DATABASE_URL=(.+)$/m)?.[1]
    ?.trim()
    .replace(/^['"]|['"]$/g, "");
if (dbUrl?.startsWith("file:")) {
  const path = resolve("backend/prisma", dbUrl.slice(5));
  mkdirSync(dirname(path), { recursive: true });
  closeSync(openSync(path, "a"));
}
console.log("Ambiente local configurado.");
