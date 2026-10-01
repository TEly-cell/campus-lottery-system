import { NextResponse } from "next/server";
import { getStorageStats, mutate } from "@/storage/database/store";
import { uuid, nowISO } from "@/storage/database/store";
import { deleteCache } from "@/lib/cache";

// POST /api/database/migrate - 初始化内置存储（替代原 PostgreSQL 迁移）
export async function POST() {
  try {
    const migrationResults: string[] = [];

    // 1. 确保数据文件与基础结构就绪
    const stats = getStorageStats();
    migrationResults.push(`✓ 内置存储引擎就绪（当前数据：参与者 ${stats.participants}、奖项 ${stats.prizes}、中奖记录 ${stats.winners}）`);

    // 2. 首次启动时自动创建默认奖项（一等奖×1、二等奖×2、三等奖×3）
    if (stats.prizes === 0) {
      mutate((db) => {
        const now = nowISO();
        db.prizes.push(
          { id: uuid(), name: "一等奖", count: 1, createdAt: now },
          { id: uuid(), name: "二等奖", count: 2, createdAt: now },
          { id: uuid(), name: "三等奖", count: 3, createdAt: now }
        );
      });
      migrationResults.push("✓ 已自动创建默认奖项（一等奖×1、二等奖×2、三等奖×3）");
    } else {
      migrationResults.push("奖项已存在，跳过默认奖项创建");
    }

    // 初始化后清空相关缓存，确保前端立即看到最新数据
    await deleteCache("prizes");
    await deleteCache("participants");
    await deleteCache("winners");

    return NextResponse.json({
      success: true,
      message: "内置存储初始化完成",
      details: migrationResults,
      stats,
    });
  } catch (error) {
    console.error("存储初始化失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "存储初始化失败"
      },
      { status: 500 }
    );
  }
}
