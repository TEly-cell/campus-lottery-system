import { useState, useEffect, useCallback } from "react";

export interface Participant {
  id: string;
  name: string;
  phone: string | null;
  isFixedWinner: boolean;
  fixedPrizeId: string | null;
  winProbability: number | null;
  winProbabilities: Record<string, number> | null;
  createdAt: Date | string;
}

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/participants");
      const data = await response.json();
      if (data.success) {
        setParticipants(data.data || []);
      }
    } catch (error) {
      console.error("获取参与者列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addParticipant = useCallback(async (name: string, phone?: string) => {
    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchParticipants();
        return true;
      }
      return false;
    } catch (error) {
      console.error("添加参与者失败:", error);
      return false;
    }
  }, [fetchParticipants]);

  const updateParticipant = useCallback(async (
    id: string,
    updates: Partial<Participant>
  ) => {
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        await fetchParticipants();
        return true;
      }
      return false;
    } catch (error) {
      console.error("更新参与者失败:", error);
      return false;
    }
  }, [fetchParticipants]);

  const deleteParticipant = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await fetchParticipants();
        return true;
      }
      return false;
    } catch (error) {
      console.error("删除参与者失败:", error);
      return false;
    }
  }, [fetchParticipants]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    loading,
    fetchParticipants,
    addParticipant,
    updateParticipant,
    deleteParticipant,
  };
}
