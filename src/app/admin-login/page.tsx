"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存登录状态到 localStorage
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminLoginTime", Date.now().toString());
        // 跳转到管理员页面
        window.location.href = "/admin-draw";
      } else {
        setError(data.error || "登录失败");
      }
    } catch (error) {
      console.error("登录失败:", error);
      setError("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center p-4 md:p-6">
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
            <div className="flex justify-center mb-3">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl">管理员登录</CardTitle>
            <CardDescription className="text-sm md:text-base">
              请输入管理员账户和密码
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10"
                  />
                </div>
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
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-xs md:text-sm text-gray-600 dark:text-gray-400">
          <p>仅限授权管理员访问</p>
        </div>
      </div>
    </div>
  );
}
