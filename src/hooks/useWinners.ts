import { useState, useEffect, useCallback } from "react";

export interface Winner {
  id: string;
  participantName: string;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

export function useWinners(autoRefresh = false, refreshInterval = 3000) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWinners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/lottery/winners");
      const data = await response.json();
      if (data.success) {
        setWinners(data.data || []);
      }
    } catch (error) {
      console.error("获取中奖记录失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const drawWinner = useCallback(async (prizeId: string) => {
    try {
      const response = await fetch("/api/lottery/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchWinners();
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("抽奖失败:", error);
      return false;
    }
  }, [fetchWinners]);

  const resetLottery = useCallback(async () => {
    try {
      const response = await fetch("/api/lottery/reset", {
        method: "PUT",
      });

      const data = await response.json();
      if (data.success) {
        await fetchWinners();
        return true;
      }
      return false;
    } catch (error) {
      console.error("重置抽奖失败:", error);
      return false;
    }
  }, [fetchWinners]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchWinners, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchWinners]);

  return {
    winners,
    loading,
    fetchWinners,
    drawWinner,
    resetLottery,
  };
}
