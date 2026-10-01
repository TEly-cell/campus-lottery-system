import { NextRequest, NextResponse } from "next/server";
import { participantManager } from "@/storage/database/participantManager";
import { insertParticipantSchema, updateParticipantSchema } from "@/storage/database/shared/schema";

// GET /api/participants - 获取参与者列表（无缓存，实时查询）
export async function GET(request: NextRequest) {
  try {
    // 直接查询数据库，获取最新数据
    const participants = await participantManager.getParticipants();
    return NextResponse.json({ success: true, data: participants });
  } catch (error) {
    console.error("获取参与者列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取参与者列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/participants - 添加参与者
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = insertParticipantSchema.parse(body);

    // 检查姓名是否已存在（防重复报名）
    const existingParticipant = await participantManager.getParticipantByName(validated.name);
    if (existingParticipant) {
      return NextResponse.json(
        { success: false, error: `姓名 "${validated.name}" 已存在，请勿重复报名。如非本人，请在姓名后加学号区分` },
        { status: 400 }
      );
    }

    const participant = await participantManager.createParticipant(validated);

    return NextResponse.json({ success: true, data: participant });
  } catch (error) {
    console.error("添加参与者失败:", error);
    // 处理数据库唯一约束违反错误
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        { success: false, error: "该姓名+学号已存在，请勿重复报名" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "添加参与者失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/participants - 批量删除参与者
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "请提供要删除的参与者ID列表" },
        { status: 400 }
      );
    }

    // 逐个删除参与者
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const success = await participantManager.deleteParticipant(id);
        if (success) {
          successCount++;
        } else {
          failedCount++;
          errors.push(`ID ${id} 不存在`);
        }
      } catch (error) {
        failedCount++;
        errors.push(`ID ${id} 删除失败: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: ids.length,
        successCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("批量删除参与者失败:", error);
    return NextResponse.json(
      { success: false, error: "批量删除参与者失败" },
      { status: 500 }
    );
  }
}
