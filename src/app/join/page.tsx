"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, CheckCircle } from "lucide-react";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("请输入姓名+学号");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setName("");
        setPhone("");
        setCountdown(5);

        // 倒计时逻辑
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              window.location.href = "/";
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || "报名失败");
      }
    } catch (error) {
      console.error("报名失败:", error);
      setError("报名失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-50 dark:from-red-950/30 dark:via-orange-950/30 dark:to-red-950/30 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (window.location.href = "/")}
          className="mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* 主卡片 */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Sparkles className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl">抽奖报名</CardTitle>
            <CardDescription className="text-sm md:text-base">扫描二维码，填写信息即可参与抽奖</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400">
              <p>请填写姓名+学号参与抽奖</p>
              <p>📱 手机号为选填项，仅用于中奖通知</p>
            </div>
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <p>⚠️ 请正确填写姓名+学号，例如：张三2022210000</p>
            </div>
            {success ? (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-green-600 dark:text-green-400">
                  报名成功！
                </h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  恭喜您已成功参与抽奖
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm md:text-base text-blue-700 dark:text-blue-400">
                    {countdown > 0 ? `${countdown} 秒后自动跳转到抽奖页面...` : "正在跳转..."}
                  </p>
                </div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500">
                  祝您好运！
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    姓名+学号 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="例如：张三2022210000"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    手机号 <span className="text-gray-400">（可选）</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="请输入您的手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-11 md:h-12"
                  disabled={loading}
                >
                  {loading ? "提交中..." : "立即报名"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-xs md:text-sm text-gray-600 dark:text-gray-400">
          <p>扫描二维码即可参与抽奖</p>
          <p className="mt-1">祝您好运！</p>
        </div>
      </div>
    </div>
  );
}
