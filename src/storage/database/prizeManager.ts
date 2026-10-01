import { mutate, getDb, uuid, nowISO } from "./store";
import { insertPrizeSchema, updatePrizeSchema } from "./shared/schema";
import type { Prize, InsertPrize, UpdatePrize } from "./shared/schema";

export class PrizeManager {
  async createPrize(data: InsertPrize): Promise<Prize> {
    const validated = insertPrizeSchema.parse(data);
    return mutate((db) => {
      const prize: Prize = {
        id: uuid(),
        name: validated.name,
        count: validated.count,
        createdAt: nowISO(),
      };
      db.prizes.push(prize);
      return prize;
    });
  }

  async getPrizes(): Promise<Prize[]> {
    return [...getDb().prizes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getPrizeById(id: string): Promise<Prize | null> {
    return getDb().prizes.find((p) => p.id === id) || null;
  }

  async updatePrize(id: string, data: UpdatePrize): Promise<Prize | null> {
    const validated = updatePrizeSchema.parse(data);
    return mutate((db) => {
      const prize = db.prizes.find((p) => p.id === id);
      if (!prize) return null;
      if (validated.name !== undefined) prize.name = validated.name;
      if (validated.count !== undefined) prize.count = validated.count;
      return prize;
    });
  }

  async deletePrize(id: string): Promise<boolean> {
    return mutate((db) => {
      const index = db.prizes.findIndex((p) => p.id === id);
      if (index === -1) return false;
      db.prizes.splice(index, 1);
      // 级联删除该奖项的中奖记录，保证数据一致性
      db.winners = db.winners.filter((w) => w.prizeId !== id);
      return true;
    });
  }

  async initializeDefaultPrizes(): Promise<void> {
    mutate((db) => {
      if (db.prizes.length === 0) {
        const now = nowISO();
        db.prizes.push(
          { id: uuid(), name: "一等奖", count: 1, createdAt: now },
          { id: uuid(), name: "二等奖", count: 2, createdAt: now },
          { id: uuid(), name: "三等奖", count: 3, createdAt: now }
        );
      }
      // 初始化后清空所有中奖与参与者数据由调用方（/api/lottery/init）控制
    });
  }
}

export const prizeManager = new PrizeManager();
