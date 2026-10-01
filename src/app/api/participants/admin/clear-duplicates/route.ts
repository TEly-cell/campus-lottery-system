import { NextResponse } from "next/server";
import { getDb, mutate } from "@/storage/database/store";

/**
 * GET /api/participants/admin/clear-duplicates
 * 检查是否有重复的参与者（按姓名）
 */
export async function GET() {
  try {
    const db = getDb();

    const byName = new Map<string, typeof db.participants>();
    for (const p of db.participants) {
      const list = byName.get(p.name) || [];
      list.push(p);
      byName.set(p.name, list);
    }

    const duplicates = [];
    for (const [name, list] of byName) {
      if (list.length > 1) {
        const sorted = [...list].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        duplicates.push({
          name,
          count: list.length,
          participants: sorted.map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            createdAt: p.createdAt,
          })),
        });
      }
    }

    if (duplicates.length === 0) {
      return NextResponse.json({ hasDuplicates: false });
    }

    return NextResponse.json({
      hasDuplicates: true,
      duplicates,
    });
  } catch (error) {
    console.error("检查重复参与者失败:", error);
    return NextResponse.json(
      { error: "检查失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/participants/admin/clear-duplicates
 * 清理重复的参与者（保留最早的一条记录）
 */
export async function POST() {
  try {
    const deletedCount = mutate((db) => {
      const sorted = [...db.participants].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const toDelete: string[] = [];
      const kept: Set<string> = new Set();

      for (const participant of sorted) {
        if (!kept.has(participant.name)) {
          kept.add(participant.name);
        } else {
          toDelete.push(participant.id);
        }
      }

      if (toDelete.length > 0) {
        const deleteSet = new Set(toDelete);
        db.participants = db.participants.filter((p) => !deleteSet.has(p.id));
      }

      return toDelete.length;
    });

    if (deletedCount === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "没有重复的参与者",
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `已清理 ${deletedCount} 条重复报名记录`,
    });
  } catch (error) {
    console.error("清理重复参与者失败:", error);
    return NextResponse.json(
      { error: "清理失败" },
      { status: 500 }
    );
  }
}
