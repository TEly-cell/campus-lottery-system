"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Trophy, Home, ArrowLeft } from "lucide-react";

interface Winner {
  id: string;
  participantName: string;
  participantPhone: string | null;
  prizeName: string;
  isFixed: boolean;
  createdAt: Date | string;
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Winner | null>(null);
  const [error, setError] = useState("");

  const handleQuery = async () => {
    if (!query.trim()) {
      setError("请输入手机号或姓名");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/lottery/query?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else if (data.success && !data.data) {
        setError("未找到中奖记录，请确认输入信息是否正确");
      } else {
        setError(data.message || "查询失败");
      }
    } catch (err) {
      setError("查询失败，请稍后重试");
      console.error("查询失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuery();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-purple-950/30">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-purple-600 dark:text-purple-400">
              查询中奖结果
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
              输入您报名时使用的手机号或姓名
            </p>
          </div>
          <div className="w-[100px]"></div>
        </div>

        {/* 查询卡片 */}
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              输入查询信息
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              请输入您报名时使用的手机号或姓名
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query" className="text-sm md:text-base">
                手机号 / 姓名
              </Label>
              <Input
                id="query"
                placeholder="请输入手机号或姓名"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="h-12 text-base"
              />
            </div>
            <Button
              onClick={handleQuery}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-base"
              size="lg"
            >
              {loading ? "查询中..." : "查询"}
            </Button>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm md:text-base text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            {/* 查询结果 */}
            {result && (
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      🎉 恭喜中奖！
                    </div>
                    <p className="text-lg md:text-xl text-purple-600 dark:text-purple-400 font-semibold">
                      {result.prizeName}
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm md:text-base">
                      <span className="text-gray-600 dark:text-gray-400">中奖人：</span>
                      <span className="font-semibold">{result.participantName}</span>
                    </div>
                    {result.participantPhone && (
                      <div className="flex justify-between text-sm md:text-base">
                        <span className="text-gray-600 dark:text-gray-400">手机号：</span>
                        <span className="font-semibold">
                          {result.participantPhone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Badge className="bg-gradient-to-r from-red-500 to-yellow-500 text-white text-sm md:text-base px-4 py-2">
                      ✨ 毕业晚会幸运星！
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <div className="max-w-2xl mx-auto mt-6 md:mt-8 space-y-3">
          <div className="text-center text-sm md:text-base text-gray-600 dark:text-gray-400 space-y-1">
            <p>💡 提示：请使用报名时填写的手机号或姓名进行查询</p>
          </div>
        </div>
      </div>
    </div>
  );
}
