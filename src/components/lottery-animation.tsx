"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Trophy, Sparkles, X } from "lucide-react";

interface Winner {
  id: string;
  participantName: string;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

interface Participant {
  id: string;
  name: string;
}

interface LotteryAnimationProps {
  winner: Winner;
  participants: Participant[];
  onClose: () => void;
  onAnimationComplete?: () => void;
}

export function LotteryAnimation({ winner, participants, onClose, onAnimationComplete }: LotteryAnimationProps) {
  const [rolling, setRolling] = useState(true);
  const [currentName, setCurrentName] = useState("准备抽奖...");
  const [showResult, setShowResult] = useState(false);

  // 根据奖项等级获取滚动时长
  const getRollDuration = (prizeName: string): number => {
    if (prizeName.includes("一等奖")) return 20000; // 20秒
    if (prizeName.includes("二等奖")) return 10000; // 10秒
    if (prizeName.includes("三等奖")) return 6000;  // 6秒
    return 6000; // 默认6秒
  };

  // 使用真实的参与者列表（用于滚动动画）
  const participantNames = participants.map(p => p.name);

  // 使用ref避免依赖变化导致effect重新执行
  const rollingNamesRef = useRef<string[]>([]);

  // 初始化滚动名字列表
  useEffect(() => {
    const names = participantNames.length > 0 ? participantNames : [
      "张伟", "李娜", "王芳", "刘洋", "陈静", "杨明", "赵强", "黄丽",
      "周杰", "吴敏", "徐磊", "孙倩", "马超", "朱芳", "胡斌", "林萍",
      "郭军", "何平", "高勇", "罗梅", "郑涛", "梁艳", "宋波", "唐红",
      "许强", "邓丽", "韩超", "冯平", "于洋", "董芳", "萧杰", "程敏"
    ];
    rollingNamesRef.current = names;
  }, [participantNames]);

  // 预生成随机名字序列，避免每次都随机选择
  const generateRandomSequence = (duration: number): string[] => {
    const names = rollingNamesRef.current;
    const totalChanges = duration / 100; // 每100ms切换一次
    const sequence: string[] = [];

    for (let i = 0; i < totalChanges; i++) {
      const randomIndex = Math.floor(Math.random() * names.length);
      sequence.push(names[randomIndex]);
    }

    return sequence;
  };

  useEffect(() => {
    const duration = getRollDuration(winner.prizeName);
    let interval: NodeJS.Timeout;
    let elapsed = 0;

    // 预生成随机名字序列
    const nameSequence = generateRandomSequence(duration);
    let currentIndex = 0;

    // 开始滚动动画
    interval = setInterval(() => {
      // 如果已经显示结果，立即停止
      if (showResult) {
        clearInterval(interval);
        return;
      }

      // 使用预生成的序列中的名字
      if (currentIndex < nameSequence.length) {
        setCurrentName(nameSequence[currentIndex]);
        currentIndex++;
      }

      elapsed += 100;

      // 到达指定时长后停止滚动
      if (elapsed >= duration) {
        clearInterval(interval);
        setRolling(false);
        setShowResult(true);

        // 动画完成后回调
        setTimeout(() => {
          onAnimationComplete?.();
        }, 2000);
      }
    }, 100); // 每100毫秒切换一次名字

    return () => clearInterval(interval);
  }, [winner.prizeName, onAnimationComplete, showResult]);

  // 自动关闭（5秒后）
  useEffect(() => {
    if (showResult) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showResult, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(178, 34, 34, 0.9)",
        backdropFilter: "blur(8px)"
      }}
    >
      <Card className="relative max-w-lg w-full overflow-hidden shadow-2xl border-4"
            style={{
              background: "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #fbbf24 100%)",
              borderColor: "#fbbf24"
            }}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors hover:bg-white/20"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1.5"
             style={{
               background: "linear-gradient(90deg, #fbbf24 0%, #fde68a 50%, #fbbf24 100%)"
             }}>
        </div>

        {/* 装饰性灯笼 */}
        <div className="absolute -top-2 left-6">
          <div className="w-5 h-6 rounded-full"
               style={{ backgroundColor: "#b91c1c", border: "2px solid #fbbf24" }}>
          </div>
          <div className="w-1.5 h-2.5 mx-auto"
               style={{ backgroundColor: "#fbbf24" }}>
          </div>
        </div>
        <div className="absolute -top-2 right-6">
          <div className="w-5 h-6 rounded-full"
               style={{ backgroundColor: "#b91c1c", border: "2px solid #fbbf24" }}>
          </div>
          <div className="w-1.5 h-2.5 mx-auto"
               style={{ backgroundColor: "#fbbf24" }}>
          </div>
        </div>

        <div className="p-8 md:p-12 text-center text-white">
          {/* 奖项标题 */}
          <div className="mb-8">
            {/* 主标题 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <Trophy className="w-8 h-8 md:w-10 md:h-10" style={{ color: "#fbbf24" }} />
              <h2 className="text-2xl md:text-3xl font-bold"
                  style={{ color: "#fef3c7" }}>
                {rolling ? "正在抽取" : "🎉 恭喜中奖！"}
              </h2>
            </motion.div>

            {/* 奖项等级 - 更加醒目显示 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={`relative text-3xl md:text-5xl font-bold rounded-2xl px-8 py-4 inline-block border-3 ${
                rolling
                  ? "bg-gradient-to-r from-red-800 via-red-700 to-red-800 text-yellow-100 border-yellow-400"
                  : "text-red-900 border-yellow-300"
              }`}
              style={
                !rolling
                  ? {
                      background: "linear-gradient(135deg, #fbbf24 0%, #fde68a 50%, #fbbf24 100%)",
                      boxShadow: "0 0 40px rgba(251, 191, 36, 0.8), inset 0 2px 4px rgba(255,255,255,0.3)"
                    }
                  : {
                      boxShadow: "0 0 25px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.2)",
                      animation: "pulse 2s ease-in-out infinite",
                      borderWidth: "4px"
                    }
              }
            >
              {/* 滚动时装饰性光点 */}
              {rolling && (
                <>
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: "0.5s" }}></div>
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: "1s" }}></div>
                </>
              )}

              <span className="inline-flex items-center gap-3 relative z-10">
                <span className="text-3xl md:text-4xl">
                  {rolling ? "🎰" : "🏆"}
                </span>
                <span className="relative">
                  {winner.prizeName}
                  {/* 光晕效果 */}
                  {!rolling && (
                    <span className="absolute inset-0 blur-xl bg-yellow-300 opacity-50 -z-10"></span>
                  )}
                </span>
              </span>
            </motion.div>

            {/* 滚动时的提示文字 */}
            {rolling && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base md:text-lg mt-4 text-yellow-100 font-medium"
              >
                <span className="inline-block animate-pulse">🎊</span>
                {" "}正在抽取 <span className="text-yellow-300 font-bold text-xl">{winner.prizeName}</span> 的幸运得主
                {" "}<span className="inline-block animate-pulse" style={{ animationDelay: "0.5s" }}>🎊</span>
              </motion.p>
            )}
          </div>

          {/* 滚动动画区域 */}
          <div className="relative mb-8">
            <motion.div
              animate={rolling ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
              className="rounded-2xl p-6 md:p-8 flex items-center justify-center shadow-inner"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "2px solid rgba(251, 191, 36, 0.6)",
                backdropFilter: "blur(4px)",
                minHeight: "140px",
                height: "140px"
              }}
            >
              <AnimatePresence mode="sync">
                <motion.div
                  key={showResult ? `result-${winner.id}` : currentName}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.06 }}
                  className={`font-bold leading-tight text-center ${
                    showResult
                      ? "text-transparent bg-clip-text"
                      : "text-white"
                  }`}
                  style={
                    showResult
                      ? {
                          backgroundImage: "linear-gradient(180deg, #fbbf24 0%, #fde68a 50%, #fbbf24 100%)",
                          textShadow: "0 2px 10px rgba(251, 191, 36, 0.5)",
                          fontSize: showResult ? "36px" : "48px",
                        }
                      : {
                        fontSize: currentName.length > 4 ? "36px" : "48px"
                      }
                  }
                >
                  {showResult ? winner.participantName : currentName}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* 装饰元素 */}
            {rolling && (
              <>
                <div className="absolute -top-4 -right-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-8 h-8" style={{ color: "#fbbf24" }} />
                  </motion.div>
                </div>
                <div className="absolute -top-4 -left-4">
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-6 h-6" style={{ color: "#fde68a" }} />
                  </motion.div>
                </div>
              </>
            )}
          </div>

          {/* 提示信息 */}
          <div className="text-sm md:text-base"
               style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            {rolling ? (
              <p style={{ color: "#fef3c7" }}>🎊 正在抽取幸运之星...</p>
            ) : (
              <p className="flex items-center justify-center gap-2"
                 style={{ color: "#fef3c7" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
                恭喜 <span className="font-bold" style={{ color: "#fbbf24" }}>{winner.participantName}</span> 获得 <span className="font-bold" style={{ color: "#fbbf24" }}>{winner.prizeName}</span>！
                <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
              </p>
            )}
          </div>
        </div>

        {/* 底部装饰条 */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5"
             style={{
               background: "linear-gradient(90deg, #fbbf24 0%, #fde68a 50%, #fbbf24 100%)"
             }}>
        </div>
      </Card>
    </motion.div>
  );
}
