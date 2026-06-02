import { apiRoute } from "@/lib/api";
import { getSnapshot } from "@/lib/snapshot";

// 全場讀取模型，任何已登入者皆可讀（無機密資訊）
export const GET = apiRoute([], async () => getSnapshot());
