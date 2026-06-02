import { apiRoute, str } from "@/lib/api";
import { prisma } from "@/lib/db";

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

// Admin 新增題目
export const POST = apiRoute(["ADMIN"], async ({ body }) => {
  const q = await prisma.question.create({
    data: {
      gameName: str(body, "gameName"),
      prompt: str(body, "prompt"),
      answer: typeof body.answer === "string" ? (body.answer as string) : null,
      difficulty: typeof body.difficulty === "string" ? (body.difficulty as string) : null,
    },
  });
  return q;
});
