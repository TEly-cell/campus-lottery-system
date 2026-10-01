import { NextRequest, NextResponse } from "next/server";
import { winnerManager } from "@/storage/database/winnerManager";
import { getCache, setCache, deleteCache, DEFAULT_TTL } from "@/lib/cache";

// GET /api/lottery/winners - 获取获奖名单
export async function GET() {
  try {
    // 尝试从缓存获取
    const cacheKey = "winners";
    const cachedWinners = await getCache(cacheKey);

    if (cachedWinners) {
      console.log("Winners cache hit");
      return NextResponse.json({ success: true, data: cachedWinners, cached: true });
    }

    console.log("Winners cache miss, fetching from database...");
    const winners = await winnerManager.getWinnerDetails();

    // 设置缓存（5秒）
    await setCache(cacheKey, winners, DEFAULT_TTL.WINNERS);

    return NextResponse.json({ success: true, data: winners, cached: false });
  } catch (error) {
    console.error("获取获奖名单失败:", error);
    return NextResponse.json(
      { success: false, error: "获取获奖名单失败" },
      { status: 500 }
    );
  }
}

// POST /api/lottery/winners - 抽奖
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prizeId } = body;

    if (!prizeId) {
      return NextResponse.json(
        { success: false, error: "请指定奖项ID" },
        { status: 400 }
      );
    }

    const winner = await winnerManager.drawPrize(prizeId);

    // 抽奖成功后，立即清除缓存
    await deleteCache("winners");
    console.log("Cache cleared after drawing winner");

    return NextResponse.json({ success: true, data: winner });
  } catch (error: any) {
    console.error("抽奖失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "抽奖失败" },
      { status: 500 }
    );
  }
}
