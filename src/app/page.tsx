"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Gift, Trophy, Users, QrCode, Eye, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LotteryAnimation } from "@/components/lottery-animation";

interface Prize {
  id: string;
  name: string;
  count: number;
}

interface Participant {
  id: string;
  name: string;
  phone: string | null;
}

interface Winner {
  id: string;
  participantName: string;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

export default function Home() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [showWinnersDialog, setShowWinnersDialog] = useState(false);
  const [selectedPrizeIndex, setSelectedPrizeIndex] = useState(0);
  // 二维码地址：动态取当前访问域名，扫码后打开本站报名页
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  useEffect(() => {
    setQrCodeUrl(`${window.location.origin}/join`);
  }, []);

  // 抽奖动画相关状态
  const [currentLotteryWinner, setCurrentLotteryWinner] = useState<Winner | null>(null);
  const [showLotteryAnimation, setShowLotteryAnimation] = useState(false);
  const [lastWinnerCount, setLastWinnerCount] = useState(0);
  const lastWinnerIdsRef = useRef<Set<string>>(new Set());
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, []);

  // 定时刷新数据（30秒，减少频繁请求）
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 轮询检测新中奖者（每2秒检测一次）
  useEffect(() => {
    let isFirstCheck = true;

    const checkNewWinners = async () => {
      try {
        const response = await fetch("/api/lottery/winners");
        const data = await response.json();

        if (data.success && data.data) {
          const newWinners: Winner[] = data.data;
          const currentWinnerIds = new Set(newWinners.map((w: Winner) => w.id));

          // 首次检查时，记录所有现有中奖者ID，避免重复显示动画
          if (isFirstCheck) {
            lastWinnerIdsRef.current = currentWinnerIds;
            isFirstCheck = false;
            return; // 首次检查不显示动画
          }

          // 找出新出现的中奖者（排除已记录的）
          const newWinner = newWinners.find((w: Winner) => !lastWinnerIdsRef.current.has(w.id));

          if (newWinner && !isAnimatingRef.current) {
            // 发现新中奖者，显示抽奖动画（无缓存，实时数据）
            setCurrentLotteryWinner(newWinner);
            setShowLotteryAnimation(true);
            isAnimatingRef.current = true;
          }

          // 更新已记录的中奖者ID
          lastWinnerIdsRef.current = currentWinnerIds;
        }
      } catch (error) {
        console.error("检测新中奖者失败:", error);
      }
    };

    // 每2秒检测一次新中奖者
    const interval = setInterval(checkNewWinners, 2000);
    return () => clearInterval(interval);
  }, []);

  // 抽奖动画完成后的处理
  const handleAnimationComplete = () => {
    isAnimatingRef.current = false;
    // 刷新数据以更新中奖列表
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [prizesRes, winnersRes, participantsRes] = await Promise.all([
        fetch("/api/prizes"),
        fetch("/api/lottery/winners"),
        fetch("/api/participants"),
      ]);

      const prizesData = await prizesRes.json();
      const winnersData = await winnersRes.json();
      const participantsData = await participantsRes.json();

      if (prizesData.success) setPrizes(prizesData.data);
      if (winnersData.success) setWinners(winnersData.data);
      if (participantsData.success) {
        setParticipants(participantsData.data);
        setParticipantCount(participantsData.data.length);
      }
    } catch (error) {
      console.error("获取数据失败:", error);
    }
  };

  const getWinnerCount = (prizeId: string) => {
    return winners.filter((w) => w.prizeName === prizes.find((p) => p.id === prizeId)?.name).length;
  };

  // 按奖项分组获奖者
  const getWinnersByPrize = () => {
    const grouped: Record<string, Winner[]> = {};
    winners.forEach(winner => {
      if (!grouped[winner.prizeName]) {
        grouped[winner.prizeName] = [];
      }
      grouped[winner.prizeName].push(winner);
    });
    return grouped;
  };

  // 获取排序后的奖项名称列表（按一等奖、二等奖、三等奖等顺序）
  const getSortedPrizeNames = () => {
    const prizeOrder = [
      "特等奖",
      "一等奖",
      "二等奖",
      "三等奖",
      "四等奖",
      "五等奖",
      "参与奖",
      "幸运奖",
    ];

    const prizeNames = Object.keys(getWinnersByPrize());

    return prizeNames.sort((a, b) => {
      const indexA = prizeOrder.indexOf(a);
      const indexB = prizeOrder.indexOf(b);

      // 如果两个奖项都在预定义列表中，按列表顺序排序
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // 如果只有一个在预定义列表中，预定义的排在前面
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // 如果都不在预定义列表中，按名称排序
      return a.localeCompare(b, 'zh-CN');
    });
  };

  // 计算奖品总数
  const totalPrizeCount = prizes.reduce((sum, prize) => sum + prize.count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-50 dark:from-red-950/30 dark:via-orange-950/30 dark:to-red-950/30">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* 头部 */}
        <div className="flex flex-col items-center justify-center gap-3 mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-red-600 dark:text-red-400 leading-relaxed max-w-lg sm:max-w-none">
            百廿山农薪火相传<br className="sm:hidden" /> 六十六载经管再续华章
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-medium text-center text-red-500/80 dark:text-red-400/70">
            山东农业大学经济管理学院2026届毕业晚会
          </p>
        </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
            <Card className="shadow-sm">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
                  <Users className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">参与人数</span>
                  <span className="sm:hidden">参与</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-3xl font-bold">{participantCount}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
                  <Trophy className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">中奖人数</span>
                  <span className="sm:hidden">中奖</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-3xl font-bold">{winners.length}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2 md:pb-3 px-3 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2">
                  <Gift className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">奖品总数</span>
                  <span className="sm:hidden">奖品</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-2xl md:text-3xl font-bold">{totalPrizeCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* 报名入口 */}
          <Card className="mb-6 md:mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-xl flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                参与抽奖
              </CardTitle>
              <CardDescription className="text-xs md:text-base">
                扫描二维码或点击下方按钮报名参与抽奖
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8">
                {/* 二维码显示区域 */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 sm:p-3 md:p-4 rounded-xl shadow-md">
                    <QRCodeSVG
                      value={qrCodeUrl}
                      size={120}
                      className="sm:!w-[140px] sm:!h-[140px] md:!w-[160px] md:!h-[160px]"
                      level="H"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 md:mt-3 text-center">
                    使用手机扫码报名
                  </p>
                </div>

                {/* 按钮区域 */}
                <div className="w-full sm:w-auto sm:flex-1 max-w-xs flex flex-col gap-2 md:gap-3">
                  <Button
                    onClick={() => (window.location.href = "/join")}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full h-11 md:h-12 text-sm md:text-base"
                    size="lg"
                  >
                    点击报名
                  </Button>
                  <div className="text-center text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-0.5 md:space-y-1">
                    <p>填写姓名+学号即可参与</p>
                    <p>手机号为选填项</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 查询中奖结果 */}
          <Card className="mb-6 md:mb-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="text-base md:text-xl flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                查询中奖结果
              </CardTitle>
              <CardDescription className="text-xs md:text-base">
                输入您的手机号或姓名查询是否中奖
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => (window.location.href = "/query")}
                className="bg-purple-600 hover:bg-purple-700 text-white w-full h-11 md:h-12 text-sm md:text-base"
                size="lg"
              >
                点击查询
              </Button>
              <div className="text-center text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2 md:mt-3">
                想知道是否中奖？点击查询
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* 左侧：奖项列表 */}
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-base md:text-xl flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  奖项列表
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">查看各奖项的剩余数量</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
                  {prizes.map((prize) => {
                    const winnerCount = getWinnerCount(prize.id);
                    const remaining = prize.count - winnerCount;
                    return (
                      <div
                        key={prize.id}
                        className={`p-2 md:p-4 border-2 rounded-xl transition-all ${
                          remaining <= 0
                            ? "border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-60"
                            : "border-red-300 bg-red-50 dark:bg-red-900/20"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm md:text-lg font-bold mb-0.5 md:mb-1">{prize.name}</div>
                          <div className="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">
                            已抽 {winnerCount} / {prize.count}
                          </div>
                          {remaining <= 0 && (
                            <Badge className="mt-1 md:mt-2 text-[10px] md:text-sm" variant="secondary">
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

            {/* 右侧：中奖名单 */}
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base md:text-xl flex items-center gap-2">
                      <Trophy className="w-5 h-5 shrink-0" />
                      中奖名单
                      <span className="text-xs md:text-sm font-normal text-gray-500">({winners.length})</span>
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">实时显示中奖结果</CardDescription>
                  </div>
                  {winners.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPrizeIndex(0);
                        setShowWinnersDialog(true);
                      }}
                      className="flex items-center gap-1 md:gap-2 text-xs md:text-sm shrink-0"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      查看获奖名单
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 md:space-y-3 max-h-[300px] md:max-h-[500px] overflow-y-auto">
                  {winners.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm md:text-base">
                      暂无中奖记录
                    </div>
                  ) : (
                    winners.map((winner, index) => (
                      <div
                        key={winner.id}
                        className="flex items-center justify-between p-1.5 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
                          <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-[10px] md:text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs md:text-base truncate">{winner.participantName}</div>
                            <div className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 truncate">
                              {winner.prizeName}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 管理员入口 */}
          <div className="mt-8 md:mt-12 text-center">
            <Button
              onClick={() => (window.location.href = "/admin-login")}
              variant="ghost"
              size="sm"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs md:text-sm"
            >
              管理员入口
            </Button>
          </div>
        </div>

        {/* 获奖名单弹窗 */}
        <Dialog open={showWinnersDialog} onOpenChange={(open) => {
          setShowWinnersDialog(open);
          if (open) {
            setSelectedPrizeIndex(0);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-2xl flex items-center gap-2">
                <Trophy className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
                获奖名单
              </DialogTitle>
              <DialogDescription>点击奖项查看对应的获奖人员</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {/* 奖项标签页 */}
              {Object.keys(getWinnersByPrize()).length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getSortedPrizeNames().map((prizeName, index) => {
                      const prizeWinners = getWinnersByPrize()[prizeName] || [];
                      const isSelected = selectedPrizeIndex === index;

                      return (
                        <button
                          key={prizeName}
                          onClick={() => setSelectedPrizeIndex(index)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            isSelected
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {prizeName}
                        </button>
                      );
                    })}
                  </div>

                  {/* 当前选中奖项的获奖名单 */}
                  {(() => {
                    const sortedPrizeNames = getSortedPrizeNames();
                    const currentPrizeName = sortedPrizeNames[selectedPrizeIndex];
                    const prizeWinners = getWinnersByPrize()[currentPrizeName] || [];
                    const prize = prizes.find(p => p.name === currentPrizeName);
                    const winnerCount = prizeWinners.length;
                    const totalCount = prize?.count || 0;
                    const remaining = totalCount - winnerCount;

                    return (
                      <div className="border rounded-lg p-3 md:p-4">
                        <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-xl shrink-0">
                              {selectedPrizeIndex + 1}
                            </div>
                            <h3 className="text-lg md:text-2xl font-bold truncate">{currentPrizeName}</h3>
                          </div>
                          <Badge className="bg-green-500 text-white text-xs md:text-sm shrink-0" variant="secondary">
                            已抽 {winnerCount} / {totalCount}
                          </Badge>
                        </div>
                        {remaining > 0 && winnerCount > 0 && (
                          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            还剩 {remaining} 个名额
                          </div>
                        )}
                        {prizeWinners.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            暂无获奖记录
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {prizeWinners.map((winner, wIndex) => (
                              <div
                                key={winner.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">
                                  {wIndex + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-sm md:text-base truncate">{winner.participantName}</div>
                                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                    获奖时间：{new Date(winner.createdAt).toLocaleString('zh-CN')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  暂无奖项
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 抽奖动画 */}
        {showLotteryAnimation && currentLotteryWinner && (
          <LotteryAnimation
            winner={currentLotteryWinner}
            participants={participants}
            onClose={() => {
              setShowLotteryAnimation(false);
              setCurrentLotteryWinner(null);
              isAnimatingRef.current = false;
            }}
            onAnimationComplete={handleAnimationComplete}
          />
        )}
      </div>
    );
}
