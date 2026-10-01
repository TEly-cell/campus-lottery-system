import { mutate, getDb, uuid, nowISO } from "./store";
import { insertParticipantSchema, updateParticipantSchema } from "./shared/schema";
import type { Participant, InsertParticipant, UpdateParticipant } from "./shared/schema";

export class ParticipantManager {
  async createParticipant(data: InsertParticipant): Promise<Participant> {
    const validated = insertParticipantSchema.parse(data);
    return mutate((db) => {
      const participant: Participant = {
        id: uuid(),
        name: validated.name,
        employeeId: null,
        phone: validated.phone ?? null,
        isFixedWinner: validated.isFixedWinner ?? false,
        fixedPrizeId: validated.fixedPrizeId ?? null,
        winProbability: validated.winProbability ?? null,
        winProbabilities: validated.winProbabilities ?? null,
        createdAt: nowISO(),
      };
      db.participants.push(participant);
      return participant;
    });
  }

  async getParticipants(options: {
    skip?: number;
    limit?: number;
  } = {}): Promise<Participant[]> {
    const { skip = 0, limit = 1000 } = options; // 默认1000条，支持更多参与者
    const sorted = [...getDb().participants].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sorted.slice(skip, skip + limit);
  }

  async getParticipantById(id: string): Promise<Participant | null> {
    return getDb().participants.find((p) => p.id === id) || null;
  }

  async getParticipantByName(name: string): Promise<Participant | null> {
    return getDb().participants.find((p) => p.name === name) || null;
  }

  async updateParticipant(id: string, data: any): Promise<Participant | null> {
    return mutate((db) => {
      const participant = db.participants.find((p) => p.id === id);
      if (!participant) return null;
      Object.assign(participant, data as Partial<Participant>);
      return participant;
    });
  }

  async deleteParticipant(id: string): Promise<boolean> {
    return mutate((db) => {
      const index = db.participants.findIndex((p) => p.id === id);
      if (index === -1) return false;
      db.participants.splice(index, 1);
      // 级联删除该参与者的中奖记录，保证数据一致性
      db.winners = db.winners.filter((w) => w.participantId !== id);
      return true;
    });
  }

  async getFixedWinners(): Promise<Participant[]> {
    return getDb().participants.filter((p) => p.isFixedWinner === true);
  }

  async getParticipantsNotFixedWinner(): Promise<Participant[]> {
    return getDb().participants.filter((p) => p.isFixedWinner === false);
  }

  async getFixedWinnerByPrizeId(prizeId: string): Promise<Participant | null> {
    return (
      getDb().participants.find(
        (p) => p.isFixedWinner === true && p.fixedPrizeId === prizeId
      ) || null
    );
  }

  async getFixedWinnersCountByPrizeId(prizeId: string): Promise<number> {
    return getDb().participants.filter(
      (p) => p.isFixedWinner === true && p.fixedPrizeId === prizeId
    ).length;
  }
}

export const participantManager = new ParticipantManager();
