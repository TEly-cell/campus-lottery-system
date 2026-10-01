"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Winner {
  id: string;
  participantName: string;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

interface LotteryAnimationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LotteryAnimation({ isOpen, onClose }: LotteryAnimationProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [currentNameIndex, setCurrentNameIndex] = useState(0);
  const [lastWinnerId, setLastWinnerId] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const rollingRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取参与者名单（用于滚动动画）
  const fetchParticipants = async () => {
    try {
      const response = await fetch("/api/participants");
      const data = await response.json();
      if (data.success && data.data) {
        const names = data.data.map((p: any) => p.name);
        setParticipantNames(names);
      }
    } catch (error) {
      console.error("获取参与者名单失败:", error);
    }
  };

  // 获取最新中奖结果
  const fetchLatestWinner = async () => {
    try {
      const response = await fetch("/api/lottery/winners");
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const latestWinner = data.data[0]; // 获取最新的中奖者

        // 如果发现新的中奖者
        if (latestWinner.id !== lastWinnerId && !isRolling && !showResult) {
          setLastWinnerId(latestWinner.id);
          startRollingAnimation(latestWinner);
        }
      }
    } catch (error) {
      console.error("获取中奖结果失败:", error);
    }
  };

  // 根据奖项名称获取滚动时长（毫秒）
  const getRollingDuration = (prizeName: string): number => {
    const name = prizeName.toLowerCase();

    // 一等奖：20秒
    if (name.includes("一等奖") || name.includes("特等奖")) {
      return 20000;
    }

    // 二等奖：10秒
    if (name.includes("二等奖")) {
      return 10000;
    }

    // 三等奖：6秒
    if (name.includes("三等奖")) {
      return 6000;
    }

    // 其他奖项：8秒
    return 8000;
  };

  // 开始滚动动画
  const startRollingAnimation = (newWinner: Winner) => {
    setIsRolling(true);
    setShowResult(false);
    setWinner(newWinner);

    const duration = getRollingDuration(newWinner.prizeName);
    const intervalTime = 100; // 每100ms切换一次名字
    const totalIterations = duration / intervalTime;

    let iteration = 0;

    // 清除之前的定时器
    if (rollingRef.current) {
      clearInterval(rollingRef.current);
    }

    // 开始滚动名字
    rollingRef.current = setInterval(() => {
      iteration++;
      setCurrentNameIndex(Math.floor(Math.random() * participantNames.length));

      if (iteration >= totalIterations) {
        // 滚动结束，显示结果
        if (rollingRef.current) {
          clearInterval(rollingRef.current);
          rollingRef.current = null;
        }
        setIsRolling(false);
        setShowResult(true);

        // 5秒后自动关闭
        resultTimeoutRef.current = setTimeout(() => {
          handleReset();
        }, 5000);
      }
    }, intervalTime);
  };

  // 重置状态
  const handleReset = () => {
    setIsRolling(false);
    setShowResult(false);
    setWinner(null);
    setLastWinnerId(null);
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  };

  // 组件挂载时
  useEffect(() => {
    fetchParticipants();

    // 每2秒轮询一次中奖结果
    pollingRef.current = setInterval(() => {
      fetchLatestWinner();
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (rollingRef.current) {
        clearInterval(rollingRef.current);
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
    };
  }, [lastWinnerId, isRolling, showResult]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-gradient-to-br from-red-50 via-yellow-50 to-red-50 dark:from-red-950/30 dark:via-orange-950/30 dark:to-red-950/30">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              抽奖进行中
            </DialogTitle>
            {!isRolling && !showResult && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 pt-4">
          {isRolling && (
            <div className="text-center py-16">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-xl">
                  <Sparkles className="w-16 h-16 text-white animate-spin" />
                </div>
              </motion.div>

              <motion.h2 className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                正在抽取幸运儿...
              </motion.h2>

              <motion.div
                key={currentNameIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-5xl md:text-6xl font-bold text-red-600 dark:text-red-400"
              >
                {participantNames[currentNameIndex] || "加载中..."}
              </motion.div>

              {winner && (
                <div className="mt-8">
                  <div className="inline-block px-6 py-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <span className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                      {winner.prizeName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {showResult && winner && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="mb-8"
                >
                  <div className="w-40 h-40 mx-auto bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full flex items-center justify-center shadow-2xl">
                    <Trophy className="w-20 h-20 text-white" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl font-bold mb-4"
                >
                  🎉 恭喜中奖！
                </motion.h2>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <div className="inline-block px-8 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-full border-2 border-yellow-400 dark:border-yellow-600">
                    <span className="text-2xl md:text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                      {winner.prizeName}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring", duration: 0.8 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">中奖者</p>
                  <p className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                    {winner.participantName}
                  </p>
                </motion.div>

                {winner.isFixed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-6 text-sm text-red-600 dark:text-red-400"
                  >
                    * 内定中奖
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {!isRolling && !showResult && (
            <div className="text-center py-16">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-6" />
                <h2 className="text-2xl text-gray-600 dark:text-gray-400 mb-4">
                  等待抽奖开始...
                </h2>
                <p className="text-gray-500 dark:text-gray-500">
                  请关注大屏幕，抽奖即将开始
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
