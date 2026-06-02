import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";

// 公開唯讀快照：給免登入的投影頁用（內容本來就投在大螢幕公開，無機密）
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSnapshot());
}
