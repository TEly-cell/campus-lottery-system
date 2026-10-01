import { NextRequest, NextResponse } from "next/server";
import { prizeManager } from "@/storage/database/prizeManager";
import { updatePrizeSchema } from "@/storage/database/shared/schema";
import { deleteCache } from "@/lib/cache";

// DELETE /api/prizes/:id - 删除奖项
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await prizeManager.deletePrize(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "奖项不存在" },
        { status: 404 }
      );
    }

    // 删除奖项后，清除缓存
    await deleteCache("prizes");
    await deleteCache("winners");
    console.log("Cache cleared after deleting prize");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除奖项失败:", error);
    return NextResponse.json(
      { success: false, error: "删除奖项失败" },
      { status: 500 }
    );
  }
}

// PUT /api/prizes/:id - 更新奖项
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updatePrizeSchema.parse(body);

    const prize = await prizeManager.updatePrize(id, validated);

    if (!prize) {
      return NextResponse.json(
        { success: false, error: "奖项不存在" },
        { status: 404 }
      );
    }

    // 更新奖项后，清除缓存
    await deleteCache("prizes");
    await deleteCache("winners");
    console.log("Cache cleared after updating prize");

    return NextResponse.json({ success: true, data: prize });
  } catch (error) {
    console.error("更新奖项失败:", error);
    return NextResponse.json(
      { success: false, error: "更新奖项失败" },
      { status: 500 }
    );
  }
}
