import { NextRequest, NextResponse } from "next/server";
import { prizeManager } from "@/storage/database/prizeManager";
import { winnerManager } from "@/storage/database/winnerManager";
import { deleteCache } from "@/lib/cache";

// POST /api/lottery/init - 初始化默认奖项
export async function POST() {
  try {
    // 清空所有数据
    await winnerManager.clearAllParticipants();
    // 初始化默认奖项
    await prizeManager.initializeDefaultPrizes();
    // 清空缓存，确保前端立即看到最新数据
    await deleteCache("prizes");
    await deleteCache("participants");
    await deleteCache("winners");
    return NextResponse.json({ success: true, message: "已初始化默认奖项" });
  } catch (error) {
    console.error("初始化失败:", error);
    return NextResponse.json(
      { success: false, error: "初始化失败" },
      { status: 500 }
    );
  }
}
