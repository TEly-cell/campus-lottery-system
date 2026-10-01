/**
 * 进程内内存缓存（替代 Coze 平台 Redis 缓存）
 * 接口签名与原实现保持一致，路由层无需改动。
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

// 默认 TTL（秒）
export const DEFAULT_TTL = {
  WINNERS: 5,        // 中奖记录：5秒
  PRIZES: 3600,      // 奖项列表：1小时
  PARTICIPANTS: 30,  // 参与者列表：30秒
  STATS: 10,         // 统计信息：10秒
};

/**
 * 获取缓存
 * @param key 缓存键
 * @returns 缓存值或 null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cacheStore.delete(key);
      return null;
    }
    return structuredClone(entry.value) as T;
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
}

/**
 * 设置缓存
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 过期时间（秒），默认 60 秒
 */
export async function setCache<T>(key: string, value: T, ttl: number = 60): Promise<boolean> {
  try {
    cacheStore.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttl * 1000,
    });
    return true;
  } catch (error) {
    console.error("Error setting cache:", error);
    return false;
  }
}

/**
 * 删除缓存
 * @param key 缓存键（支持通配符后缀）
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    if (key.includes("*")) {
      const prefix = key.replace(/\*.*$/, "");
      for (const k of cacheStore.keys()) {
        if (k.startsWith(prefix)) cacheStore.delete(k);
      }
    } else {
      cacheStore.delete(key);
    }
    return true;
  } catch (error) {
    console.error("Error deleting cache:", error);
    return false;
  }
}

/**
 * 清空所有抽奖相关缓存
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    cacheStore.clear();
    return true;
  } catch (error) {
    console.error("Error clearing all cache:", error);
    return false;
  }
}
