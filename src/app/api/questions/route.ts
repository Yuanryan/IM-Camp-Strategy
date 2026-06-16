import { apiRoute, num, str } from "@/lib/api";
import { prisma } from "@/lib/db";

const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export const GET = apiRoute(["MOBILE", "ADMIN"], async ({ req }) => {
  const game = req.nextUrl.searchParams.get("game");
  const where = game ? { gameName: game } : {};
  const questions = await prisma.question.findMany({ where, orderBy: { id: "asc" } });
  const games = await prisma.question.findMany({
    distinct: ["gameName"],
    select: { gameName: true },
    orderBy: { gameName: "asc" },
  });
  return { games: games.map((g) => g.gameName), questions };
});

// 新增題目（流動關主 / Admin）
export const POST = apiRoute(["MOBILE", "ADMIN"], async ({ body }) => {
  const q = await prisma.question.create({
    data: {
      gameName: str(body, "gameName"),
      prompt: str(body, "prompt"),
      answer: optStr(body.answer),
      difficulty: optStr(body.difficulty),
      options: optStr(body.options),
    },
  });
  return q;
});

// 編輯題目
export const PATCH = apiRoute(["MOBILE", "ADMIN"], async ({ body }) => {
  const q = await prisma.question.update({
    where: { id: num(body, "id") },
    data: {
      gameName: str(body, "gameName"),
      prompt: str(body, "prompt"),
      answer: optStr(body.answer),
      difficulty: optStr(body.difficulty),
      options: optStr(body.options),
    },
  });
  return q;
});

// 刪除題目
export const DELETE = apiRoute(["MOBILE", "ADMIN"], async ({ body }) => {
  await prisma.question.delete({ where: { id: num(body, "id") } });
  return { ok: true };
});
