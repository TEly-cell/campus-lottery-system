import { NextRequest, NextResponse } from "next/server";
import { winnerManager } from "@/storage/database/winnerManager";

// GET /api/lottery/query?q=xxx - 查询中奖结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { success: false, message: "请输入查询信息" },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    const winners = await winnerManager.getWinnerDetails();

    // 查找匹配的中奖记录（按手机号或姓名）
    const matchedWinner = winners.find(
      (w: any) =>
        w.participantPhone === trimmedQuery ||
        w.participantName === trimmedQuery
    );

    return NextResponse.json({
      success: true,
      data: matchedWinner || null,
    });
  } catch (error) {
    console.error("查询中奖结果失败:", error);
    return NextResponse.json(
      { success: false, message: "查询失败，请稍后重试" },
      { status: 500 }
    );
  }
}
