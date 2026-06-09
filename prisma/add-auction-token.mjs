// 非破壞性：只補一張 AUCTION（拍賣官）登入 token，不動既有資料。
// 用法：node prisma/add-auction-token.mjs
import { PrismaClient } from "../src/generated/prisma/index.js";
import { randomBytes } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const p = new PrismaClient();

const existing = await p.accessToken.findFirst({ where: { role: "AUCTION" } });
if (existing) {
  console.log(`已存在 AUCTION token：${BASE_URL}/api/login?t=${existing.token}`);
} else {
  const token = randomBytes(16).toString("hex");
  await p.accessToken.create({ data: { token, role: "AUCTION", label: "拍賣官" } });
  console.log(`已建立 AUCTION token：${BASE_URL}/api/login?t=${token}`);
}
await p.$disconnect();
