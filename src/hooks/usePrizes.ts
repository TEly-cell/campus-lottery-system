import { useState, useEffect, useCallback } from "react";

export interface Prize {
  id: string;
  name: string;
  count: number;
  createdAt: Date | string;
}

export function usePrizes() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrizes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/prizes");
      const data = await response.json();
      if (data.success) {
        setPrizes(data.data || []);
      }
    } catch (error) {
      console.error("获取奖项列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addPrize = useCallback(async (name: string, count: number) => {
    try {
      const response = await fetch("/api/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, count }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchPrizes();
        return true;
      }
      return false;
    } catch (error) {
      console.error("添加奖项失败:", error);
      return false;
    }
  }, [fetchPrizes]);

  const updatePrize = useCallback(async (
    id: string,
    updates: { name?: string; count?: number }
  ) => {
    try {
      const response = await fetch(`/api/prizes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        await fetchPrizes();
        return true;
      }
      return false;
    } catch (error) {
      console.error("更新奖项失败:", error);
      return false;
    }
  }, [fetchPrizes]);

  const deletePrize = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/prizes/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await fetchPrizes();
        return true;
      }
      return false;
    } catch (error) {
      console.error("删除奖项失败:", error);
      return false;
    }
  }, [fetchPrizes]);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  return {
    prizes,
    loading,
    fetchPrizes,
    addPrize,
    updatePrize,
    deletePrize,
  };
}
