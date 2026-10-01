import { mutate, getDb } from "./store";
import { insertWinnerSchema } from "./shared/schema";
import type { Winner, InsertWinner, Participant, Prize } from "./shared/schema";
import { participantManager } from "./participantManager";
import { prizeManager } from "./prizeManager";

export class WinnerManager {
  async createWinner(data: InsertWinner): Promise<Winner> {
    const validated = insertWinnerSchema.parse(data);
    return mutate((db) => {
      const winner: Winner = {
        id: crypto.randomUUID(),
        participantId: validated.participantId,
        prizeId: validated.prizeId,
        isFixed: validated.isFixed,
        createdAt: new Date().toISOString(),
      };
      db.winners.push(winner);
      return winner;
    });
  }

  async getWinners(): Promise<Winner[]> {
    return [...getDb().winners].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getWinnersByPrizeId(prizeId: string): Promise<Winner[]> {
    return getDb()
      .winners.filter((w) => w.prizeId === prizeId)
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  async getWinnerCountByPrizeId(prizeId: string): Promise<number> {
    return getDb().winners.filter((w) => w.prizeId === prizeId).length;
  }

  async getParticipantWinnerIds(): Promise<string[]> {
    return getDb().winners.map((w) => w.participantId);
  }

  async getWinnerDetails(): Promise<
    Array<{
      id: string;
      participantId: string;
      participantName: string;
      participantPhone: string | null;
      prizeName: string;
      isFixed: boolean;
      createdAt: Date;
    }>
  > {
    const db = getDb();
    const details = db.winners
      .map((w) => {
        const participant = db.participants.find((p) => p.id === w.participantId);
        const prize = db.prizes.find((p) => p.id === w.prizeId);
        if (!participant || !prize) return null;
        return {
          id: w.id,
          participantId: w.participantId,
          participantName: participant.name,
          participantPhone: participant.phone,
          prizeName: prize.name,
          isFixed: w.isFixed,
          createdAt: w.createdAt as unknown as Date,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    return details;
  }

  async drawPrize(prizeId: string): Promise<Participant | null> {
    // 获取奖项信息
    const prize = await prizeManager.getPrizeById(prizeId);
    if (!prize) {
      throw new Error("奖项不存在");
    }

    // 获取已中奖的人数
    const winnerCount = await this.getWinnerCountByPrizeId(prizeId);
    if (winnerCount >= prize.count) {
      throw new Error("该奖项已抽完");
    }

    // 获取已中奖的参与者ID
    const winnerIds = await this.getParticipantWinnerIds();

    // 检查是否有内定获奖者
    const fixedWinners = await participantManager.getFixedWinners();
    const fixedWinnerForThisPrize = fixedWinners.find(
      (fw) => fw.fixedPrizeId === prizeId && !winnerIds.includes(fw.id)
    );

    if (fixedWinnerForThisPrize) {
      // 最后检查：确保内定人员没有中奖
      const latestWinnerIds = await this.getParticipantWinnerIds();
      if (latestWinnerIds.includes(fixedWinnerForThisPrize.id)) {
        throw new Error(`内定人员 ${fixedWinnerForThisPrize.name} 已经中奖，请检查内定设置`);
      }

      // 抽中内定人员（100%概率）
      mutate((db) => {
        db.winners.push({
          id: crypto.randomUUID(),
          participantId: fixedWinnerForThisPrize.id,
          prizeId: prizeId,
          isFixed: true,
          createdAt: new Date().toISOString(),
        });
      });
      return fixedWinnerForThisPrize;
    }

    // 随机抽取非内定人员（考虑中奖概率）
    const availableParticipants = await participantManager.getParticipantsNotFixedWinner();
    const eligibleParticipants = availableParticipants.filter(
      (p) => !winnerIds.includes(p.id)
    );

    if (eligibleParticipants.length === 0) {
      throw new Error("没有可抽奖的人员");
    }

    // 计算总人数
    const totalParticipants = eligibleParticipants.length;

    // 使用加权随机算法抽取
    // 优先使用分奖项概率，如果没有则使用统一的 winProbability
    // 如果都没有，使用默认概率 1/总人数 * 100
    const weights = eligibleParticipants.map((p) => {
      // 检查是否有针对当前奖项的概率设置
      if (p.winProbabilities && p.winProbabilities[prizeId] !== undefined) {
        return p.winProbabilities[prizeId];
      }
      // 检查是否有统一概率设置（向后兼容）
      if (p.winProbability !== null && p.winProbability !== undefined) {
        return p.winProbability;
      }
      // 默认概率：1/总人数 * 100
      return (1 / totalParticipants) * 100;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // 生成随机数（0到总权重之间）
    let random = Math.random() * totalWeight;

    // 累加权重，选择第一个超过随机数的参与者
    let selectedParticipant: Participant | undefined;
    for (let i = 0; i < eligibleParticipants.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedParticipant = eligibleParticipants[i];
        break;
      }
    }

    // 如果由于浮点精度问题没有选中，选最后一个
    if (!selectedParticipant) {
      selectedParticipant = eligibleParticipants[eligibleParticipants.length - 1];
    }

    // 最后检查：确保选中的参与者没有中奖（双重保护）
    const latestWinnerIds = await this.getParticipantWinnerIds();
    if (latestWinnerIds.includes(selectedParticipant!.id)) {
      throw new Error("该参与者已经中奖，请重新抽取");
    }

    // 记录获奖
    mutate((db) => {
      db.winners.push({
        id: crypto.randomUUID(),
        participantId: selectedParticipant!.id,
        prizeId: prizeId,
        isFixed: false,
        createdAt: new Date().toISOString(),
      });
    });

    return selectedParticipant!;
  }

  async clearAllWinners(): Promise<void> {
    mutate((db) => {
      db.winners = [];
    });
  }

  async clearAllParticipants(): Promise<void> {
    mutate((db) => {
      db.winners = [];
      db.participants = [];
    });
  }

  /**
   * 清理重复的中奖记录
   * 保留最早的中奖记录，删除后续的重复记录
   * 返回被删除的记录数量
   */
  async clearDuplicateWinners(): Promise<number> {
    return mutate((db) => {
      const sorted = [...db.winners].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const toDelete: string[] = [];
      const kept: Set<string> = new Set();

      for (const winner of sorted) {
        if (!kept.has(winner.participantId)) {
          kept.add(winner.participantId);
        } else {
          toDelete.push(winner.id);
        }
      }

      if (toDelete.length > 0) {
        const deleteSet = new Set(toDelete);
        db.winners = db.winners.filter((w) => !deleteSet.has(w.id));
      }

      return toDelete.length;
    });
  }

  /**
   * 检查是否有重复的中奖记录
   */
  async hasDuplicateWinners(): Promise<boolean> {
    const seen = new Set<string>();
    for (const w of getDb().winners) {
      if (seen.has(w.participantId)) return true;
      seen.add(w.participantId);
    }
    return false;
  }
}

export const winnerManager = new WinnerManager();
