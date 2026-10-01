import { NextRequest, NextResponse } from "next/server";
import { prizeManager } from "@/storage/database/prizeManager";
import { insertPrizeSchema, updatePrizeSchema } from "@/storage/database/shared/schema";
import { getCache, setCache, deleteCache, DEFAULT_TTL } from "@/lib/cache";

// GET /api/prizes - 获取奖项列表
export async function GET() {
  try {
    // 尝试从缓存获取
    const cacheKey = "prizes";
    const cachedPrizes = await getCache(cacheKey);

    if (cachedPrizes) {
      console.log("Prizes cache hit");
      return NextResponse.json({ success: true, data: cachedPrizes, cached: true });
    }

    console.log("Prizes cache miss, fetching from database...");
    const prizes = await prizeManager.getPrizes();

    // 设置缓存（1小时）
    await setCache(cacheKey, prizes, DEFAULT_TTL.PRIZES);

    return NextResponse.json({ success: true, data: prizes, cached: false });
  } catch (error) {
    console.error("获取奖项列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取奖项列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/prizes - 添加奖项
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = insertPrizeSchema.parse(body);

    const prize = await prizeManager.createPrize(validated);

    // 添加奖项后，清除缓存
    await deleteCache("prizes");
    console.log("Cache cleared after adding prize");

    return NextResponse.json({ success: true, data: prize });
  } catch (error) {
    console.error("添加奖项失败:", error);
    return NextResponse.json(
      { success: false, error: "添加奖项失败" },
      { status: 500 }
    );
  }
}
