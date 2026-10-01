import { NextResponse } from "next/server";
import { winnerManager } from "@/storage/database/winnerManager";

/**
 * GET /api/lottery/admin/check-duplicates
 * 检查是否有重复的中奖记录
 */
export async function GET() {
  try {
    const hasDuplicates = await winnerManager.hasDuplicateWinners();
    return NextResponse.json({ hasDuplicates });
  } catch (error) {
    console.error("检查重复记录失败:", error);
    return NextResponse.json(
      { error: "检查失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lottery/admin/clear-duplicates
 * 清理重复的中奖记录
 */
export async function POST() {
  try {
    const deletedCount = await winnerManager.clearDuplicateWinners();
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 条重复记录`,
    });
  } catch (error) {
    console.error("清理重复记录失败:", error);
    return NextResponse.json(
      { error: "清理失败" },
      { status: 500 }
    );
  }
}
