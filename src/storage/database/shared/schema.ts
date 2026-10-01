import { z } from "zod";

// ============ 类型定义（与原 PostgreSQL 表结构保持一致） ============

export type Participant = {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  isFixedWinner: boolean;
  fixedPrizeId: string | null;
  winProbability: number | null;
  winProbabilities: Record<string, number> | null;
  createdAt: string;
};

export type Prize = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
};

export type Winner = {
  id: string;
  participantId: string;
  prizeId: string;
  isFixed: boolean;
  createdAt: string;
};

// ============ Zod 校验 Schema（接口入参校验，与原 drizzle-zod 等价） ============

export const insertParticipantSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  phone: z.string().nullable().optional(),
  isFixedWinner: z.boolean().optional(),
  fixedPrizeId: z.string().nullable().optional(),
  winProbability: z.number().nullable().optional(),
  winProbabilities: z.record(z.string(), z.number()).nullable().optional(),
});

export const updateParticipantSchema = z.object({
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  isFixedWinner: z.boolean().optional(),
  fixedPrizeId: z.string().nullable().optional(),
  winProbability: z.number().nullable().optional(),
  winProbabilities: z.record(z.string(), z.number()).nullable().optional(),
});

export const insertPrizeSchema = z.object({
  name: z.string().min(1, "奖项名称不能为空"),
  count: z.number().int().min(1, "数量必须大于0"),
});

export const updatePrizeSchema = z.object({
  name: z.string().optional(),
  count: z.number().int().min(1).optional(),
});

export const insertWinnerSchema = z.object({
  participantId: z.string(),
  prizeId: z.string(),
  isFixed: z.boolean().default(false),
});

// ============ 输入类型 ============

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type UpdateParticipant = z.infer<typeof updateParticipantSchema>;
export type InsertPrize = z.infer<typeof insertPrizeSchema>;
export type UpdatePrize = z.infer<typeof updatePrizeSchema>;
export type InsertWinner = z.infer<typeof insertWinnerSchema>;
