import { NextRequest, NextResponse } from "next/server";
import { participantManager } from "@/storage/database/participantManager";
import { prizeManager } from "@/storage/database/prizeManager";
import { updateParticipantSchema } from "@/storage/database/shared/schema";
import { deleteCache } from "@/lib/cache";

// DELETE /api/participants/:id - 删除参与者
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await participantManager.deleteParticipant(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "参与者不存在" },
        { status: 404 }
      );
    }

    // 删除参与者后，清除缓存
    await deleteCache("participants");
    await deleteCache("winners");
    console.log("Cache cleared after deleting participant");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除参与者失败:", error);
    return NextResponse.json(
      { success: false, error: "删除参与者失败" },
      { status: 500 }
    );
  }
}

// PUT /api/participants/:id - 更新参与者
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 如果要设置内定，需要检查该奖项的内定人数是否超过奖项数量
    if (body.isFixedWinner === true && body.fixedPrizeId) {
      // 获取奖项信息
      const prize = await prizeManager.getPrizeById(body.fixedPrizeId);
      if (!prize) {
        return NextResponse.json(
          { success: false, error: "奖项不存在" },
          { status: 404 }
        );
      }

      // 获取当前内定到该奖项的人数（不包括当前参与者）
      const currentFixedCount = await participantManager.getFixedWinnersCountByPrizeId(
        body.fixedPrizeId
      );

      // 检查当前参与者是否已经被内定到这个奖项
      const currentParticipant = await participantManager.getParticipantById(id);
      const isAlreadyFixedToThisPrize =
        currentParticipant?.isFixedWinner && currentParticipant?.fixedPrizeId === body.fixedPrizeId;

      // 计算设置后的内定人数
      const newFixedCount = isAlreadyFixedToThisPrize ? currentFixedCount : currentFixedCount + 1;

      // 检查是否超过奖项数量
      if (newFixedCount > prize.count) {
        return NextResponse.json(
          {
            success: false,
            error: `${prize.name} 只有 ${prize.count} 个名额，当前已有 ${currentFixedCount} 人内定，无法再增加内定人数`
          },
          { status: 400 }
        );
      }
    }

    // 实现互斥逻辑：内定和概率设置只能存在一个
    const updateData: any = {};

    // 检查是否设置了内定
    if (body.isFixedWinner === true) {
      updateData.isFixedWinner = true;
      updateData.fixedPrizeId = body.fixedPrizeId || null;
      updateData.winProbability = null; // 清空概率设置
      updateData.winProbabilities = null; // 清空分奖项概率
    } else if (body.isFixedWinner === false) {
      updateData.isFixedWinner = false;
      updateData.fixedPrizeId = null;
    }

    // 检查是否设置了分奖项概率（优先于 winProbability）
    if ("winProbabilities" in body && body.isFixedWinner !== true) {
      updateData.winProbabilities = body.winProbabilities;
      updateData.isFixedWinner = false; // 清空内定设置
      updateData.fixedPrizeId = null;
      updateData.winProbability = null; // 清空旧的概率字段
    }
    // 如果没有设置分奖项概率，检查是否设置了统一概率
    else if ("winProbability" in body && body.isFixedWinner !== true) {
      updateData.winProbability = body.winProbability;
      updateData.isFixedWinner = false; // 清空内定设置
      updateData.fixedPrizeId = null;
      updateData.winProbabilities = null; // 清空分奖项概率
    }

    // 处理其他字段
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const participant = await participantManager.updateParticipant(id, updateData);

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "参与者不存在" },
        { status: 404 }
      );
    }

    // 更新参与者后，清除缓存
    await deleteCache("participants");
    await deleteCache("winners");
    console.log("Cache cleared after updating participant");

    return NextResponse.json({ success: true, data: participant });
  } catch (error) {
    console.error("更新参与者失败:", error);
    return NextResponse.json(
      { success: false, error: "更新参与者失败" },
      { status: 500 }
    );
  }
}
