import { NextRequest, NextResponse } from "next/server";
import { winnerManager } from "@/storage/database/winnerManager";
import { deleteCache } from "@/lib/cache";

// PUT /api/lottery/reset - 重置抽奖
export async function PUT() {
  try {
    await winnerManager.clearAllWinners();
    // 清空缓存，确保前端立即看到重置后的数据
    await deleteCache("winners");
    return NextResponse.json({ success: true, message: "抽奖已重置" });
  } catch (error) {
    console.error("重置抽奖失败:", error);
    return NextResponse.json(
      { success: false, error: "重置抽奖失败" },
      { status: 500 }
    );
  }
}
