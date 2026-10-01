"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Gift, Trophy, RefreshCw, Users, Plus, Trash2, Save, X, ArrowLeft, UserPlus, Settings, LogOut, BookOpen, Upload, Download, Eraser } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  phone: string | null;
  isFixedWinner: boolean;
  fixedPrizeId: string | null;
  winProbability: number;
  winProbabilities: Record<string, number> | null;
  createdAt: Date | string;
}

interface Prize {
  id: string;
  name: string;
  count: number;
}

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

export default function AdminDrawPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState<"lottery" | "participants" | "prizes">("lottery");

  // 参与者表单
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantPhone, setNewParticipantPhone] = useState("");

  // 奖项表单
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeCount, setNewPrizeCount] = useState("1");

  // 编辑奖项
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [editPrizeName, setEditPrizeName] = useState("");
  const [editPrizeCount, setEditPrizeCount] = useState("1");
  const [isEditPrizeDialogOpen, setIsEditPrizeDialogOpen] = useState(false);

  // 内定设置对话框
  const [fixedParticipantId, setFixedParticipantId] = useState<string>("");
  const [fixedPrizeId, setFixedPrizeId] = useState<string>("");
  const [isFixedDialogOpen, setIsFixedDialogOpen] = useState(false);

  // 重置对话框
  const [showResetDialog, setShowResetDialog] = useState(false);

  // 中奖概率设置对话框
  const [probabilityParticipantId, setProbabilityParticipantId] = useState<string>("");
  const [newWinProbability, setNewWinProbability] = useState<number>(70);
  const [newWinProbabilities, setNewWinProbabilities] = useState<Record<string, number>>({});
  const [isProbabilityDialogOpen, setIsProbabilityDialogOpen] = useState(false);

  // 批量设置中奖概率对话框
  const [isBatchProbabilityDialogOpen, setIsBatchProbabilityDialogOpen] = useState(false);
  const [batchWinProbability, setBatchWinProbability] = useState<number>(70);

  // 分页和搜索
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  // 批量选择和删除
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // 一键管理名单：批量导入
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; duplicated: number; failed: number; failedDetails: string[] } | null>(null);

  // 检查登录状态
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("adminLoggedIn");
    const loginTime = localStorage.getItem("adminLoginTime");

    // 检查是否已登录且会话未过期（24小时）
    if (
      !isLoggedIn ||
      !loginTime ||
      Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000
    ) {
      // 跳转到登录页
      window.location.href = "/admin-login";
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // 定时刷新数据（每5秒）
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [participantsRes, prizesRes, winnersRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/prizes"),
        fetch("/api/lottery/winners"),
      ]);

      const participantsData = await participantsRes.json();
      const prizesData = await prizesRes.json();
      const winnersData = await winnersRes.json();

      if (participantsData.success) setParticipants(participantsData.data);
      if (prizesData.success) setPrizes(prizesData.data);
      if (winnersData.success) setWinners(winnersData.data);
    } catch (error) {
      console.error("获取数据失败:", error);
    }
  };

  const getWinnerCount = (prizeId: string) => {
    return winners.filter((w) => w.prizeName === prizes.find((p) => p.id === prizeId)?.name).length;
  };

  const handleLogout = () => {
    // 清除登录状态
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminLoginTime");
    // 跳转到首页
    window.location.href = "/";
  };

  const handleDraw = async () => {
    if (!selectedPrize) return;

    setLoading(true);
    setCurrentWinner(null);
    setShowResult(false);

    const participantsRes = await fetch("/api/participants");
    const participantsData = await participantsRes.json();
    const participantsList = participantsData.data || [];

    if (participantsList.length === 0) {
      setLoading(false);
      alert("还没有参与者，请先添加参与者！");
      return;
    }

    let scrollInterval: NodeJS.Timeout;
    let scrollCount = 0;
    const maxScrollCount = 20;

    scrollInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * participantsList.length);
      setCurrentWinner(participantsList[randomIndex].name);
      scrollCount++;

      if (scrollCount >= maxScrollCount) {
        clearInterval(scrollInterval);
        performDraw(selectedPrize.id);
      }
    }, 100);

    const performDraw = async (prizeId: string) => {
      try {
        const response = await fetch("/api/lottery/winners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prizeId }),
        });

        const data = await response.json();

        if (data.success) {
          setCurrentWinner(data.data.name);
          setShowResult(true);
          await fetchData();
        } else {
          alert(data.error || "抽奖失败");
          setCurrentWinner(null);
        }
      } catch (error) {
        console.error("抽奖失败:", error);
        alert("抽奖失败");
        setCurrentWinner(null);
      } finally {
        setLoading(false);
      }
    };
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) {
      alert("请输入姓名+学号");
      return;
    }

    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newParticipantName.trim(),
          phone: newParticipantPhone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewParticipantName("");
        setNewParticipantPhone("");
        await fetchData();
      } else {
        alert(data.error || "添加失败");
      }
    } catch (error) {
      console.error("添加参与者失败:", error);
      alert("添加失败");
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm("确定要删除该参与者吗？")) return;

    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除参与者失败:", error);
      alert("删除失败");
    }
  };

  // 批量删除参与者
  const handleBatchDelete = async () => {
    if (selectedParticipantIds.length === 0) {
      alert("请先选择要删除的参与者");
      return;
    }

    const confirmDelete = confirm(
      `确定要删除选中的 ${selectedParticipantIds.length} 位参与者吗？\n\n注意：已中奖的参与者无法删除。`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedParticipantIds,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`成功删除 ${data.data.successCount} 位参与者`);
        setSelectedParticipantIds([]);
        setIsSelectAll(false);
        await fetchData();
      } else {
        alert(data.error || "批量删除失败");
      }
    } catch (error) {
      console.error("批量删除失败:", error);
      alert("批量删除失败");
    }
  };

  // 批量删除当前搜索结果中的未中奖参与者
  const handleBatchDeleteFiltered = async () => {
    const filteredParticipants = participants.filter((participant) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        participant.name.toLowerCase().includes(searchLower) ||
        (participant.phone && participant.phone.includes(searchLower))
      );
    });

    // 过滤出未中奖的参与者
    const toDelete = filteredParticipants.filter(p => !winners.some(w => w.id === p.id));

    if (toDelete.length === 0) {
      alert("当前搜索结果中没有可删除的参与者（已中奖的参与者无法删除）");
      return;
    }

    const confirmDelete = confirm(
      `确定要删除当前搜索结果中的 ${toDelete.length} 位未中奖参与者吗？`
    );

    if (!confirmDelete) return;

    try {
      const ids = toDelete.map(p => p.id);
      const response = await fetch("/api/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`成功删除 ${data.data.successCount} 位参与者`);
        await fetchData();
      } else {
        alert(data.error || "批量删除失败");
      }
    } catch (error) {
      console.error("批量删除失败:", error);
      alert("批量删除失败");
    }
  };

  // ========== 一键管理名单 ==========

  // 批量导入名单：每行一人，支持 "姓名,手机号" / "姓名 手机号" / "姓名"
  const handleBatchImport = async () => {
    const lines = importText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      alert("请先粘贴或输入名单，每行一人");
      return;
    }

    setImporting(true);
    let added = 0;
    let duplicated = 0;
    let failed = 0;
    const failedDetails: string[] = [];

    for (const line of lines) {
      // 支持中英文逗号、空格、Tab 分隔姓名与手机号
      const parts = line.split(/[,，\t ]+/).filter(Boolean);
      const name = (parts[0] || "").trim();
      const phone = (parts[1] || "").trim() || undefined;

      if (!name) {
        failed++;
        failedDetails.push(`「${line}」缺少姓名`);
        continue;
      }

      try {
        const response = await fetch("/api/participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        });
        const data = await response.json();

        if (data.success) {
          added++;
        } else if (response.status === 400 && (data.error || "").includes("已存在")) {
          duplicated++;
        } else {
          failed++;
          failedDetails.push(`「${name}」: ${data.error || "添加失败"}`);
        }
      } catch {
        failed++;
        failedDetails.push(`「${name}」: 网络错误`);
      }
    }

    setImporting(false);
    setImportResult({ added, duplicated, failed, failedDetails });
    await fetchData();
  };

  // 导出名单 CSV（含内定与中奖状态）
  const handleExportCsv = () => {
    if (participants.length === 0) {
      alert("当前名单为空，无可导出数据");
      return;
    }

    const winnerByParticipant = new Map<string, string>();
    winners.forEach((w) => {
      winnerByParticipant.set(w.participantId, w.prizeName);
    });

    const header = "姓名,手机号,是否内定,内定奖项,中奖奖项,报名时间";
    const rows = participants.map((p) => {
      const fixedPrizeName = p.isFixedWinner && p.fixedPrizeId
        ? prizes.find((prize) => prize.id === p.fixedPrizeId)?.name || "未知奖项"
        : "";
      const wonPrizeName = winnerByParticipant.get(p.id) || "";
      const createdAt = p.createdAt ? new Date(p.createdAt).toLocaleString("zh-CN") : "";
      const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
      return [p.name, p.phone || "", p.isFixedWinner ? "是" : "否", fixedPrizeName, wonPrizeName, createdAt]
        .map(escape)
        .join(",");
    });

    // \uFEFF BOM 防止 Excel 打开中文乱码
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `抽奖名单_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 一键清空全部参与者（级联清除其中奖记录）
  const handleClearAllParticipants = async () => {
    if (participants.length === 0) {
      alert("当前名单已为空");
      return;
    }

    const hasWinners = winners.length > 0;
    const confirmed = confirm(
      `⚠️ 确定要一键清空全部 ${participants.length} 位参与者吗？\n\n` +
      (hasWinners ? "注意：已有中奖记录，清空名单将同时删除相关中奖记录！\n\n" : "") +
      "此操作不可恢复，请确认！"
    );
    if (!confirmed) return;

    try {
      const ids = participants.map((p) => p.id);
      const response = await fetch("/api/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await response.json();

      if (data.success) {
        alert(`已清空名单，共删除 ${data.data.successCount} 位参与者`);
        setSelectedParticipantIds([]);
        setIsSelectAll(false);
        await fetchData();
      } else {
        alert(data.error || "清空失败");
      }
    } catch (error) {
      console.error("一键清空失败:", error);
      alert("清空失败");
    }
  };

  const handleUpdateParticipant = async (id: string, isFixedWinner: boolean, fixedPrizeId?: string) => {
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFixedWinner,
          fixedPrizeId: isFixedWinner ? fixedPrizeId : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
      } else {
        alert(data.error || "更新失败");
      }
    } catch (error) {
      console.error("更新参与者失败:", error);
      alert("更新失败");
    }
  };

  const handleAddPrize = async () => {
    if (!newPrizeName.trim()) {
      alert("请输入奖项名称");
      return;
    }

    try {
      const response = await fetch("/api/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPrizeName.trim(),
          count: parseInt(newPrizeCount) || 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewPrizeName("");
        setNewPrizeCount("1");
        await fetchData();
      } else {
        alert(data.error || "添加失败");
      }
    } catch (error) {
      console.error("添加奖项失败:", error);
      alert("添加失败");
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm("确定要删除该奖项吗？")) return;

    try {
      const response = await fetch(`/api/prizes/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchData();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除奖项失败:", error);
      alert("删除失败");
    }
  };

  const handleUpdatePrize = async () => {
    if (!editingPrize) return;

    try {
      const response = await fetch(`/api/prizes/${editingPrize.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPrizeName.trim(),
          count: parseInt(editPrizeCount) || 1,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsEditPrizeDialogOpen(false);
        setEditingPrize(null);
        setEditPrizeName("");
        setEditPrizeCount("1");
        await fetchData();
      } else {
        alert(data.error || "更新失败");
      }
    } catch (error) {
      console.error("更新奖项失败:", error);
      alert("更新失败");
    }
  };

  const openFixedDialog = (participantId: string) => {
    setFixedParticipantId(participantId);
    setFixedPrizeId("");
    setIsFixedDialogOpen(true);
  };

  const saveFixedSettings = async () => {
    if (fixedParticipantId) {
      await handleUpdateParticipant(fixedParticipantId, true, fixedPrizeId);
    }
    setFixedParticipantId("");
    setFixedPrizeId("");
    setIsFixedDialogOpen(false);
  };

  const saveProbabilitySettings = async () => {
    if (probabilityParticipantId) {
      try {
        const response = await fetch(`/api/participants/${probabilityParticipantId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winProbabilities: newWinProbabilities,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setProbabilityParticipantId("");
          setNewWinProbability(70);
          setNewWinProbabilities({});
          setIsProbabilityDialogOpen(false);
          await fetchData();
        } else {
          alert(data.error || "更新失败");
        }
      } catch (error) {
        console.error("更新中奖概率失败:", error);
        alert("更新失败");
      }
    }
  };

  const saveBatchProbabilitySettings = async () => {
    try {
      // 批量更新所有参与者的中奖概率
      const updatePromises = participants.map((participant) =>
        fetch(`/api/participants/${participant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winProbability: batchWinProbability,
          }),
        })
      );

      const responses = await Promise.all(updatePromises);

      // 检查是否有失败的请求
      const successResults = await Promise.all(
        responses.map(async (res) => {
          const data = await res.json();
          return data.success;
        })
      );

      const allSuccess = successResults.every((success) => success);

      if (allSuccess) {
        setIsBatchProbabilityDialogOpen(false);
        setBatchWinProbability(70);
        await fetchData();
      } else {
        alert("部分更新失败，请重试");
      }
    } catch (error) {
      console.error("批量更新中奖概率失败:", error);
      alert("批量更新失败");
    }
  };

  const openProbabilityDialog = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    setProbabilityParticipantId(participantId);
    setNewWinProbability(participant?.winProbability || 70);
    // 初始化分奖项概率，如果已有则使用，否则使用默认概率
    const initialProbabilities: Record<string, number> = {};
    prizes.forEach(prize => {
      initialProbabilities[prize.id] = participant?.winProbabilities?.[prize.id] || 70;
    });
    setNewWinProbabilities(initialProbabilities);
    setIsProbabilityDialogOpen(true);
  };

  const handleReset = async () => {
    try {
      const response = await fetch("/api/lottery/reset", { method: "PUT" });
      const data = await response.json();

      if (data.success) {
        setShowResetDialog(false);
        alert("已重置成功！");
        await fetchData();
      } else {
        alert(data.error || "重置失败");
      }
    } catch (error) {
      console.error("重置失败:", error);
      alert("重置失败");
    }
  };

  // 搜索和分页逻辑
  const filteredParticipants = participants.filter((participant) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      participant.name.toLowerCase().includes(searchLower) ||
      (participant.phone && participant.phone.includes(searchLower))
    );
  });

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentParticipants = filteredParticipants.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // 搜索时重置到第一页
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // 改变每页数量时重置到第一页
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.location.href = "/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">管理员后台</h1>
              <p className="text-gray-600 dark:text-gray-400">管理参与者和抽奖</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600" variant="secondary">
              管理员模式
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/guide")}
              className="text-amber-700 hover:text-amber-800 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              操作手册
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "lottery" ? "default" : "outline"}
            onClick={() => setActiveTab("lottery")}
          >
            <Gift className="w-4 h-4 mr-2" />
            抽奖
          </Button>
          <Button
            variant={activeTab === "participants" ? "default" : "outline"}
            onClick={() => setActiveTab("participants")}
          >
            <Users className="w-4 h-4 mr-2" />
            参与者 ({participants.length})
          </Button>
          <Button
            variant={activeTab === "prizes" ? "default" : "outline"}
            onClick={() => setActiveTab("prizes")}
          >
            <Trophy className="w-4 h-4 mr-2" />
            奖项 ({prizes.length})
          </Button>
        </div>

        {activeTab === "lottery" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：奖项列表和抽奖 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    奖项列表
                  </CardTitle>
                  <CardDescription>选择奖项进行抽奖</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {prizes.map((prize) => {
                      const winnerCount = getWinnerCount(prize.id);
                      const remaining = prize.count - winnerCount;
                      return (
                        <div
                          key={prize.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedPrize?.id === prize.id
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : "border-gray-200 hover:border-red-300 dark:border-gray-700 dark:hover:border-red-700"
                          } ${remaining <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => remaining > 0 && setSelectedPrize(prize)}
                        >
                          <div className="text-center">
                            <div className="text-lg font-bold mb-2">{prize.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              剩余 {remaining} / {prize.count}
                            </div>
                            {remaining <= 0 && (
                              <Badge className="mt-3" variant="secondary">
                                已抽完
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>抽奖区域</CardTitle>
                    <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新开始抽奖
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader className="mb-4">
                          <DialogTitle>确认重新开始抽奖</DialogTitle>
                          <DialogDescription>
                            确定要重新开始抽奖吗？这将清除所有获奖记录，但会保留参与者和奖项设置。
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                          <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                            取消
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleReset}
                          >
                            确认重新开始
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <CardDescription>选择奖项后点击开始抽奖</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <div className="text-6xl font-bold mb-4 min-h-[80px] flex items-center justify-center">
                      {currentWinner ? (
                        <span className="text-red-600 dark:text-red-400">
                          {currentWinner}
                        </span>
                      ) : (
                        <span className="text-gray-400">等待抽奖...</span>
                      )}
                    </div>
                    {showResult && currentWinner && (
                      <div className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-2">
                        恭喜中奖！
                      </div>
                    )}
                    {selectedPrize && !showResult && (
                      <div className="text-lg text-gray-600 dark:text-gray-400">
                        当前抽取：{selectedPrize.name}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={handleDraw}
                      disabled={!selectedPrize || loading || getWinnerCount(selectedPrize.id) >= selectedPrize.count}
                      className="min-w-[200px] bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loading ? "抽奖中..." : "开始抽奖"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：获奖名单 */}
            <div className="space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    获奖名单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {winners.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        暂无获奖记录
                      </div>
                    ) : (
                      winners.map((winner, index) => (
                        <div
                          key={winner.id}
                          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold">{winner.participantName}</span>
                            <Badge variant={winner.isFixed ? "default" : "secondary"}>
                              {winner.isFixed ? "内定" : "随机"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                            <span>{winner.prizeName}</span>
                            <span>
                              {new Date(winner.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "participants" && (
          <div className="space-y-6">
            {/* 数据维护 - 防重复报名 */}
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <Settings className="w-5 h-5" />
                  数据维护 - 防重复报名
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-400">
                  检查和清理重复的报名记录，确保每位参与者只能报名一次
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-700 dark:text-gray-300">当前状态：</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                        姓名唯一性检查已启用
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/participants/admin/clear-duplicates", {
                            method: "GET",
                          });
                          const data = await response.json();

                          if (data.hasDuplicates) {
                            const dupDetails = data.duplicates.map((d: any) =>
                              `${d.name} (重复 ${d.count} 次)`
                            ).join('、');
                            const confirmed = confirm(`检测到以下重复的报名记录：\n\n${dupDetails}\n\n是否立即清理？\n\n清理后将保留最早的记录，删除后续的重复记录。`);
                            if (confirmed) {
                              const deleteResponse = await fetch("/api/participants/admin/clear-duplicates", {
                                method: "POST",
                              });
                              const deleteData = await deleteResponse.json();
                              alert(deleteData.message || "清理完成");
                              await fetchData();
                            }
                          } else {
                            alert("✓ 当前没有重复的报名记录");
                          }
                        } catch (error) {
                          console.error("检查重复报名失败:", error);
                          alert("检查失败，请稍后重试");
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      检查重复报名
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p>• 防重复报名机制已启用（姓名唯一性约束 + 应用层校验）</p>
                    <p>• 同一个姓名只能报名一次，重复报名将被拒绝</p>
                    <p>• 如发现异常数据（历史遗留），点击"检查重复报名"进行修复</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  添加参与者
                </CardTitle>
                <CardDescription>输入姓名+学号添加到抽奖名单</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Input
                    placeholder="姓名+学号"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    className="max-w-[180px]"
                    onKeyPress={(e) => e.key === "Enter" && handleAddParticipant()}
                  />
                  <Input
                    placeholder="手机号（可选）"
                    value={newParticipantPhone}
                    onChange={(e) => setNewParticipantPhone(e.target.value)}
                    className="max-w-[150px]"
                    onKeyPress={(e) => e.key === "Enter" && handleAddParticipant()}
                  />
                  <Button onClick={handleAddParticipant}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>参与者列表</CardTitle>
                <CardDescription>
                  共 {participants.length} 人，当前显示 {filteredParticipants.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filteredParticipants.length)}` : 0} 条
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 内定警告 */}
                {(() => {
                  // 统计每个奖项的内定人数
                  const prizeFixedCount: Record<string, Participant[]> = {};
                  participants.filter(p => p.isFixedWinner && p.fixedPrizeId).forEach(p => {
                    if (!prizeFixedCount[p.fixedPrizeId!]) {
                      prizeFixedCount[p.fixedPrizeId!] = [];
                    }
                    prizeFixedCount[p.fixedPrizeId!].push(p);
                  });

                  // 找出内定人数超过奖项数量的情况
                  const overLimitPrizes = Object.entries(prizeFixedCount)
                    .filter(([prizeId, participants]) => {
                      const prize = prizes.find(p => p.id === prizeId);
                      return prize && participants.length > prize.count;
                    });

                  return overLimitPrizes.length > 0 && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                        <div className="flex-1">
                          <div className="font-semibold text-red-800 dark:text-red-300 mb-2">
                            检测到内定人数超过奖项名额
                          </div>
                          {overLimitPrizes.map(([prizeId, participants]) => {
                            const prize = prizes.find(p => p.id === prizeId);
                            return (
                              <div key={prizeId} className="mb-2 last:mb-0">
                                <div className="text-sm text-red-700 dark:text-red-400">
                                  <span className="font-medium">{prize?.name || '未知奖项'}</span>：
                                  已内定 {participants.length} 人 / 总名额 {prize?.count} 人
                                  <span className="ml-2 text-red-600 dark:text-red-400">
                                    (超限 {participants.length - (prize?.count || 0)} 人)
                                  </span>
                                </div>
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  已内定人员：{participants.map(p => p.name).join('、')}
                                </div>
                              </div>
                            );
                          })}
                          <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                            请取消多余的内定，确保每个奖项的内定人数不超过总名额
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 内定状态提示 */}
                {(() => {
                  // 统计每个奖项的内定人数（正常范围）
                  const prizeFixedCount: Record<string, Participant[]> = {};
                  participants.filter(p => p.isFixedWinner && p.fixedPrizeId).forEach(p => {
                    if (!prizeFixedCount[p.fixedPrizeId!]) {
                      prizeFixedCount[p.fixedPrizeId!] = [];
                    }
                    prizeFixedCount[p.fixedPrizeId!].push(p);
                  });

                  // 只显示有内定但未超限的奖项
                  const normalFixedPrizes = Object.entries(prizeFixedCount)
                    .filter(([prizeId, participants]) => {
                      const prize = prizes.find(p => p.id === prizeId);
                      return prize && participants.length > 0 && participants.length <= prize.count;
                    });

                  return normalFixedPrizes.length > 0 && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 text-xl">ℹ️</span>
                        <div className="flex-1">
                          <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                            内定状态概览
                          </div>
                          {normalFixedPrizes.map(([prizeId, participants]) => {
                            const prize = prizes.find(p => p.id === prizeId);
                            const remaining = prize ? prize.count - participants.length : 0;
                            return (
                              <div key={prizeId} className="mb-2 last:mb-0">
                                <div className="text-sm text-blue-700 dark:text-blue-400">
                                  <span className="font-medium">{prize?.name || '未知奖项'}</span>：
                                  已内定 {participants.length} 人 / 总名额 {prize?.count} 人
                                  {remaining > 0 && (
                                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                                      (还可内定 {remaining} 人)
                                    </span>
                                  )}
                                  {remaining === 0 && (
                                    <span className="ml-2 text-green-600 dark:text-green-400">
                                      (已满)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 一键管理名单工具栏 */}
                <div className="mb-4 flex flex-wrap items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                  <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mr-1 whitespace-nowrap">
                    一键管理名单
                  </span>

                  <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
                    setIsImportDialogOpen(open);
                    if (!open) {
                      setImportText("");
                      setImportResult(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-gray-800">
                        <Upload className="w-4 h-4" />
                        批量导入名单
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader className="mb-2">
                        <DialogTitle>批量导入名单</DialogTitle>
                        <DialogDescription>
                          每行一人，支持「姓名,手机号」「姓名 手机号」或仅「姓名」，手机号可选。已存在的姓名将自动跳过。
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder={"张三,13900001111\n李四 13900002222\n王五"}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      {importResult && (
                        <div className="rounded-md border p-3 text-sm space-y-1">
                          <div className="font-semibold">导入完成</div>
                          <div className="text-green-600 dark:text-green-400">✓ 新增 {importResult.added} 人</div>
                          {importResult.duplicated > 0 && (
                            <div className="text-amber-600 dark:text-amber-400">⊘ 重复跳过 {importResult.duplicated} 人</div>
                          )}
                          {importResult.failed > 0 && (
                            <div className="text-red-600 dark:text-red-400">
                              ✗ 失败 {importResult.failed} 条
                              <div className="mt-1 text-xs text-red-500 dark:text-red-400 break-all">
                                {importResult.failedDetails.slice(0, 5).join("；")}
                                {importResult.failedDetails.length > 5 ? " …" : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(false)}>
                          关闭
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleBatchImport}
                          disabled={importing || !importText.trim()}
                          className="gap-2"
                        >
                          {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          {importing ? "导入中..." : "开始导入"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2 bg-white dark:bg-gray-800">
                    <Download className="w-4 h-4" />
                    导出名单CSV
                  </Button>

                  <Button variant="destructive" size="sm" onClick={handleClearAllParticipants} className="gap-2">
                    <Eraser className="w-4 h-4" />
                    一键清空全部
                  </Button>

                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    当前 {participants.length} 人
                  </span>
                </div>

                {/* 搜索框 */}
                <div className="mb-4">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="搜索姓名/手机号..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pr-10"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => handleSearchChange("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDeleteFiltered}
                      disabled={!searchQuery}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4" />
                      批量删除搜索结果
                    </Button>
                    <Dialog open={isBatchProbabilityDialogOpen} onOpenChange={(open) => {
                      setIsBatchProbabilityDialogOpen(open);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          批量设置概率
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader className="mb-4">
                          <DialogTitle>批量设置中奖概率</DialogTitle>
                          <DialogDescription>
                            为所有 {participants.length} 位参与者设置相同的中奖概率（范围：1%-85%）
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div>
                            <Label className="text-base font-medium mb-3 block">中奖概率: {batchWinProbability}%</Label>
                            <Input
                              type="range"
                              min="1"
                              max="85"
                              step="1"
                              value={batchWinProbability}
                              onChange={(e) => setBatchWinProbability(parseInt(e.target.value))}
                              className="mt-2"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-3">
                              <span>1%</span>
                              <span>43%</span>
                              <span>85%</span>
                            </div>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                              <span className="font-semibold">⚠️ 注意：</span>
                              <div className="space-y-1">
                                <p>这将一次性更新所有参与者的中奖概率</p>
                                <p>概率越高，该参与者在抽奖中的中奖机会越大</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsBatchProbabilityDialogOpen(false);
                                setBatchWinProbability(70);
                              }}
                            >
                              取消
                            </Button>
                            <Button onClick={saveBatchProbabilitySettings}>
                              <Save className="w-4 h-4 mr-2" />
                              批量更新
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* 参与者列表 */}
                <div className="space-y-3">
                  {currentParticipants.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchQuery ? "未找到匹配的参与者" : "暂无参与者"}
                    </div>
                  ) : (
                    currentParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{participant.name}</span>
                            {participant.isFixedWinner && (
                              <Badge variant="default">内定</Badge>
                            )}
                            {(() => {
                              // 检查该参与者是否已经中奖
                              const hasWon = winners.some(w => w.id === participant.id);
                              return hasWon && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                  已中奖
                                </Badge>
                              );
                            })()}
                          </div>
                          {participant.phone && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              手机号: {participant.phone}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {participant.winProbabilities && Object.keys(participant.winProbabilities).length > 0 ? (
                              Object.entries(participant.winProbabilities).map(([prizeId, probability]) => {
                                const prize = prizes.find(p => p.id === prizeId);
                                if (!prize) return null;
                                return (
                                  <Badge key={prizeId} variant="secondary" className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                                    {prize.name}: {probability}%
                                  </Badge>
                                );
                              })
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400">
                                默认概率: 1/{participants.length}
                              </Badge>
                            )}
                            {participant.isFixedWinner && participant.fixedPrizeId && (
                              <div className="text-sm text-red-600 dark:text-red-400 ml-2">
                                内定奖项: {prizes.find((p) => p.id === participant.fixedPrizeId)?.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openProbabilityDialog(participant.id)}
                            disabled={winners.some(w => w.participantId === participant.id)}
                            title={winners.some(w => w.participantId === participant.id) ? "该参与者已中奖，无法设置" : "设置中奖概率"}
                          >
                            设置概率
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openFixedDialog(participant.id)}
                            disabled={winners.some(w => w.participantId === participant.id)}
                            title={winners.some(w => w.participantId === participant.id) ? "该参与者已中奖，无法设置" : "设置内定"}
                          >
                            设置内定
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteParticipant(participant.id)}
                            disabled={winners.some(w => w.participantId === participant.id)}
                            title={winners.some(w => w.participantId === participant.id) ? "该参与者已中奖，无法删除" : "删除参与者"}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 分页控件 */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>第 {currentPage} / {totalPages} 页，共 {filteredParticipants.length} 条记录</span>
                      <div className="flex items-center gap-2">
                        <span>每页显示:</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={handleItemsPerPageChange}
                        >
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>条</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 独立的概率设置对话框 */}
        <Dialog open={isProbabilityDialogOpen} onOpenChange={(open) => {
          setIsProbabilityDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader className="mb-4">
              <DialogTitle>设置中奖概率</DialogTitle>
              <DialogDescription>
                为 {participants.find((p) => p.id === probabilityParticipantId)?.name} 设置各奖项的中奖概率（范围：1%-85%）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 max-h-[500px] overflow-y-auto px-1">
              {prizes.map((prize) => (
                <div key={prize.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">{prize.name}</Label>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {newWinProbabilities[prize.id] || 70}%
                    </span>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="85"
                    step="1"
                    value={newWinProbabilities[prize.id] || 70}
                    onChange={(e) => setNewWinProbabilities({
                      ...newWinProbabilities,
                      [prize.id]: parseInt(e.target.value)
                    })}
                  />
                </div>
              ))}
              <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProbabilityParticipantId("");
                    setNewWinProbability(70);
                    setNewWinProbabilities({});
                    setIsProbabilityDialogOpen(false);
                  }}
                >
                  取消
                </Button>
                <Button onClick={saveProbabilitySettings}>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 独立的内定设置对话框 */}
        <Dialog open={isFixedDialogOpen} onOpenChange={(open) => {
          setIsFixedDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader className="mb-4">
              <DialogTitle>设置内定</DialogTitle>
              <DialogDescription>
                为 {participants.find((p) => p.id === fixedParticipantId)?.name} 设置内定奖项
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">选择奖项</Label>
                <Select value={fixedPrizeId} onValueChange={setFixedPrizeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择奖项" />
                  </SelectTrigger>
                  <SelectContent>
                    {prizes.map((prize) => (
                      <SelectItem key={prize.id} value={prize.id}>
                        {prize.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await handleUpdateParticipant(fixedParticipantId, false);
                    setFixedParticipantId("");
                    setFixedPrizeId("");
                    setIsFixedDialogOpen(false);
                  }}
                >
                  取消内定
                </Button>
                <Button onClick={saveFixedSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {activeTab === "prizes" && (
          <div className="space-y-6">
            {/* 重复记录检查和清理 */}
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <Settings className="w-5 h-5" />
                  数据维护
                </CardTitle>
                <CardDescription className="text-orange-700 dark:text-orange-400">
                  检查和清理重复的中奖记录，确保数据一致性
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-700 dark:text-gray-300">当前系统状态：</span>
                      <span className="ml-2">
                        正常运行中
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/lottery/admin/clear-duplicates", {
                            method: "GET",
                          });
                          const data = await response.json();

                          if (data.hasDuplicates) {
                            const confirmed = confirm(`检测到重复的中奖记录，是否立即清理？\n\n清理后将保留最早的记录，删除后续的重复记录。`);
                            if (confirmed) {
                              const deleteResponse = await fetch("/api/lottery/admin/clear-duplicates", {
                                method: "POST",
                              });
                              const deleteData = await deleteResponse.json();
                              alert(deleteData.message || "清理完成");
                              await fetchData();
                            }
                          } else {
                            alert("✓ 当前没有重复的中奖记录");
                          }
                        } catch (error) {
                          console.error("检查重复记录失败:", error);
                          alert("检查失败，请稍后重试");
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      检查重复记录
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <p>• 防止重复中奖机制已启用（数据库唯一约束 + 应用层校验）</p>
                    <p>• 如发现异常数据，点击"检查重复记录"进行修复</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  添加奖项
                </CardTitle>
                <CardDescription>设置奖项名称和数量</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="奖项名称（如：一等奖）"
                    value={newPrizeName}
                    onChange={(e) => setNewPrizeName(e.target.value)}
                    className="max-w-[200px]"
                    onKeyPress={(e) => e.key === "Enter" && handleAddPrize()}
                  />
                  <Input
                    type="number"
                    placeholder="数量"
                    value={newPrizeCount}
                    onChange={(e) => setNewPrizeCount(e.target.value)}
                    className="max-w-[100px]"
                    min="1"
                    onKeyPress={(e) => e.key === "Enter" && handleAddPrize()}
                  />
                  <Button onClick={handleAddPrize}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>奖项列表</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prizes.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      暂无奖项
                    </div>
                  ) : (
                    prizes.map((prize) => (
                      <div
                        key={prize.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1">
                          <div className="font-semibold">{prize.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            数量: {prize.count}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPrize(prize);
                              setEditPrizeName(prize.name);
                              setEditPrizeCount(prize.count.toString());
                              setIsEditPrizeDialogOpen(true);
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePrize(prize.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 编辑奖项对话框 */}
            <Dialog open={isEditPrizeDialogOpen} onOpenChange={setIsEditPrizeDialogOpen}>
              <DialogContent>
                <DialogHeader className="mb-4">
                  <DialogTitle>编辑奖项</DialogTitle>
                  <DialogDescription>修改奖项名称和数量</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-3 block">奖项名称</Label>
                    <Input
                      value={editPrizeName}
                      onChange={(e) => setEditPrizeName(e.target.value)}
                      placeholder="奖项名称"
                    />
                  </div>
                  <div>
                    <Label className="text-base font-medium mb-3 block">数量</Label>
                    <Input
                      type="number"
                      value={editPrizeCount}
                      onChange={(e) => setEditPrizeCount(e.target.value)}
                      placeholder="数量"
                      min="1"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditPrizeDialogOpen(false);
                        setEditingPrize(null);
                        setEditPrizeName("");
                        setEditPrizeCount("1");
                      }}
                    >
                      取消
                    </Button>
                    <Button onClick={handleUpdatePrize}>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
