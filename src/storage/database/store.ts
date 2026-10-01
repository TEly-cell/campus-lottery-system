/**
 * 内置 JSON 文件存储引擎（替代 Coze 平台 PostgreSQL）
 *
 * - 数据持久化到项目 .data 目录下的 lottery-db.json
 * - 原子写入（临时文件 + rename），避免写入中断导致数据损坏
 * - 防抖合并落盘：短时间内的多次变更合并为一次写盘（150ms 窗口），
 *   进程退出/收到终止信号时强制冲刷未落盘数据
 * - 内存中同步可见（读写一致性不受影响），单进程内天然串行一致
 * - 可通过环境变量 DATA_DIR 指定数据目录
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ParticipantRecord {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  isFixedWinner: boolean;
  fixedPrizeId: string | null;
  winProbability: number | null;
  winProbabilities: Record<string, number> | null;
  createdAt: string; // ISO 8601
}

export interface PrizeRecord {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

export interface WinnerRecord {
  id: string;
  participantId: string;
  prizeId: string;
  isFixed: boolean;
  createdAt: string;
}

interface DatabaseShape {
  participants: ParticipantRecord[];
  prizes: PrizeRecord[];
  winners: WinnerRecord[];
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "lottery-db.json");

const EMPTY_DB: DatabaseShape = {
  participants: [],
  prizes: [],
  winners: [],
};

let db: DatabaseShape | null = null;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load(): DatabaseShape {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      db = {
        participants: Array.isArray(parsed.participants) ? parsed.participants : [],
        prizes: Array.isArray(parsed.prizes) ? parsed.prizes : [],
        winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      };
      return db;
    }
  } catch (error) {
    console.error("加载数据文件失败，将使用空数据继续:", error);
  }
  db = structuredClone(EMPTY_DB);
  persist();
  return db;
}

const PERSIST_DEBOUNCE_MS = 150;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistPending = false;

/** 实际落盘：临时文件写入后原子 rename（紧凑 JSON，减小 I/O） */
function doPersist(): void {
  if (!db) return;
  try {
    ensureDir();
    const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db), "utf-8");
    fs.renameSync(tmpFile, DB_FILE);
    persistPending = false;
  } catch (error) {
    console.error("持久化数据失败:", error);
  }
}

/** 防抖调度：窗口内的多次变更合并为一次写盘 */
function persist(): void {
  persistPending = true;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    doPersist();
  }, PERSIST_DEBOUNCE_MS);
  // 不阻止进程退出，退出时由 flushOnExit 兜底
  if (typeof persistTimer.unref === "function") persistTimer.unref();
}

/** 进程退出前冲刷未落盘数据 */
function flushOnExit(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (persistPending) doPersist();
}

if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("exit", flushOnExit);
  process.on("SIGINT", () => {
    flushOnExit();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    flushOnExit();
    process.exit(0);
  });
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** 读取整个数据库（内存中的最新状态） */
export function getDb(): DatabaseShape {
  return load();
}

/** 在一次原子持久化中执行多个变更 */
export function mutate<T>(fn: (db: DatabaseShape) => T): T {
  const database = load();
  const result = fn(database);
  persist();
  return result;
}

/** 存储健康状态 */
export function getStorageStats() {
  const database = load();
  return {
    engine: "json-file",
    file: DB_FILE,
    participants: database.participants.length,
    prizes: database.prizes.length,
    winners: database.winners.length,
  };
}
