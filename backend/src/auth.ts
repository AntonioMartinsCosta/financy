import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const saved = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  return saved.length === actual.length && timingSafeEqual(saved, actual);
}
export function signToken(userId: string, secret: string) {
  return jwt.sign({}, secret, {
    subject: userId,
    expiresIn: "7d",
    algorithm: "HS256",
    issuer: "financy",
  });
}
export function readToken(
  header: string | null,
  secret: string,
): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), secret, {
      algorithms: ["HS256"],
      issuer: "financy",
    });
    return typeof payload === "object" && typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}
