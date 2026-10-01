import { NextResponse } from "next/server";
import { getStorageStats } from "@/storage/database/store";

// GET /api/database/check - 检查内置存储状态
export async function GET() {
  try {
    const stats = getStorageStats();
    return NextResponse.json({
      success: true,
      connected: true,
      message: "内置存储工作正常",
      data: stats,
    });
  } catch (error) {
    console.error("存储检查失败:", error);
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "存储检查失败"
      },
      { status: 500 }
    );
  }
}
