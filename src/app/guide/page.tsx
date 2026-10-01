"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Settings,
  Gift,
  Users,
  Play,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Target,
  Star,
} from "lucide-react";

/* ─────────────── 步骤数据 ─────────────── */

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
  color: string; // tailwind bg color
  description: string;
  details: string[];
  tip?: string;
  warning?: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "管理员登录",
    icon: <Shield className="w-5 h-5" />,
    color: "bg-red-600",
    description: "进入管理后台，掌控全局设置与抽奖操作。",
    details: [
      "访问页面，点击底部「管理后台」按钮，进入管理员登录页",
      "输入管理员账号和密码完成登录",
      "登录后默认进入「抽奖管理」页面，可切换至「参与者管理」或「奖项管理」",
      "管理员会话有效期为 24 小时，超时需重新登录",
    ],
    tip: "首次使用建议先切换到「奖项管理」设置奖项，再到「参与者管理」添加人员，最后回到「抽奖管理」执行抽奖。",
  },
  {
    id: 2,
    title: "设置奖项",
    icon: <Gift className="w-5 h-5" />,
    color: "bg-amber-600",
    description: "创建抽奖所需的奖项和数量，系统默认提供一等奖、二等奖、三等奖。",
    details: [
      "进入管理后台，切换到「奖项管理」标签页",
      "点击「添加奖项」按钮，输入奖项名称和名额数量",
      "已创建的奖项支持编辑（修改名称或数量）和删除",
      "系统初始化时自带一等奖（1名）、二等奖（2名）、三等奖（3名），可按需调整",
      "奖项数量即该奖项最多可抽出的中奖人数",
    ],
    tip: "建议按奖品价值从高到低设置奖项，如特等奖 → 一等奖 → 二等奖 → 幸运奖，抽奖时也建议从大奖开始抽。",
  },
  {
    id: 3,
    title: "添加参与者",
    icon: <Users className="w-5 h-5" />,
    color: "bg-emerald-600",
    description: "让参与者加入抽奖名单，支持两种方式：自行报名和管理员添加。",
    details: [
      "【方式一：自行报名】将报名页面链接或二维码分享给参与者，参与者填写姓名+学号和手机号即可报名",
      "【方式二：管理员添加】在管理后台的「参与者管理」标签页，手动输入姓名+学号和手机号添加",
      "手机号为选填项，仅用于中奖通知",
      "系统会自动防止同一姓名+学号重复报名",
      "支持批量删除参与者（已中奖者不可删除）",
    ],
    tip: "推荐将首页的二维码投屏到大屏幕，让大家现场扫码自助报名，既高效又互动感强。",
  },
  {
    id: 4,
    title: "内定与概率设置（可选）",
    icon: <Target className="w-5 h-5" />,
    color: "bg-purple-600",
    description: "高级功能：指定中奖人员或调整个人的中奖概率。",
    details: [
      "【内定获奖】在参与者列表中，点击某人的「内定」按钮，选择要中哪个奖项，该人将在抽该奖项时 100% 中奖",
      "【中奖概率】点击某人的「概率」按钮，可设置其统一中奖概率（0-100）",
      "【分奖项概率】在概率设置弹窗中，还可为不同奖项设置不同的概率",
      "【批量设置概率】支持一键为所有参与者批量设置统一概率",
      "内定和概率设置不会在参与者端显示，仅管理员可见",
    ],
    warning: "内定设置需谨慎！内定人员会在对应奖项抽奖时必定中奖，请确保公平性。同一奖项只能内定一人，该人不能已经中过其他奖项。",
  },
  {
    id: 5,
    title: "执行抽奖",
    icon: <Play className="w-5 h-5" />,
    color: "bg-red-600",
    description: "在管理后台选择奖项，点击抽奖，系统随机选出幸运儿。",
    details: [
      "在管理后台的「抽奖管理」标签页，从下拉菜单中选择要抽的奖项",
      "点击「开始抽奖」按钮，屏幕上将滚动显示参与者姓名",
      "滚动结束后，系统展示中奖者姓名，同时首页会同步播放中奖动画",
      "每个奖项抽完指定人数后，该奖项自动关闭，无法继续抽取",
      "已中奖的参与者不会再次被抽中",
    ],
    tip: "建议从大奖开始抽奖（如特等奖 → 一等奖），逐步推向高潮。每抽完一个奖项，稍作停顿展示中奖结果，增强现场氛围。",
  },
  {
    id: 6,
    title: "查看中奖结果",
    icon: <Trophy className="w-5 h-5" />,
    color: "bg-amber-600",
    description: "首页实时展示中奖名单，参与者也可主动查询。",
    details: [
      "【首页展示】首页按奖项分组展示所有中奖者，自动刷新，实时更新",
      "【中奖查询】点击首页「查询中奖」按钮，输入姓名或手机号即可查询自己是否中奖",
      "【管理后台】管理后台可以看到完整的中奖名单和内定标记",
      "首页每 2 秒检测新中奖者，有新人中奖时自动弹出庆祝动画",
    ],
    tip: "现场活动时，将首页投屏到大屏幕，参与者可以实时看到中奖动画和名单滚动效果。",
  },
  {
    id: 7,
    title: "重置与重新抽奖",
    icon: <RotateCcw className="w-5 h-5" />,
    color: "bg-gray-700",
    description: "活动结束或需要重来时，可清空中奖记录或重置全部数据。",
    details: [
      "【仅重置抽奖】在管理后台点击「重置抽奖」按钮，清空所有中奖记录，保留参与者和奖项",
      "「重置抽奖」适用于同批参与者多轮抽奖的场景",
      "【初始化系统】会清空所有数据（参与者、奖项、中奖记录），恢复默认奖项",
      "「初始化系统」适用于完全重新开始的场景",
    ],
    warning: "重置操作不可撤销！执行前请确认不再需要当前数据。建议在重置前截图或记录重要信息。",
  },
];

/* ─────────────── 常见问题 ─────────────── */

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "参与者报名时提示「姓名已存在」怎么办？",
    answer: "系统不允许同名参与者重复报名。如果是重名情况，请在姓名后加上学号区分，例如「张三2022210000」。",
  },
  {
    question: "抽奖时提示「没有可抽奖的人员」？",
    answer: "出现这种情况通常是因为所有参与者都已中奖。请检查是否需要添加更多参与者，或重置抽奖后重新开始。",
  },
  {
    question: "内定人员没有中奖？",
    answer: "请确认：1) 内定设置的目标奖项是否正确；2) 该人员是否已经中了其他奖项；3) 是否在抽对应奖项时才生效。内定只在抽取指定奖项时触发。",
  },
  {
    question: "如何修改已设置的内定或概率？",
    answer: "在管理后台的参与者列表中，已设置内定的人员会显示标记，点击可重新设置或取消。概率设置同理，点击「概率」按钮重新输入即可覆盖。",
  },
  {
    question: "抽奖可以多个人同时抽吗？",
    answer: "每次抽奖只能抽出一人。如某个奖项有多个名额，需要多次点击「开始抽奖」，直到该奖项名额抽满。",
  },
  {
    question: "首页的中奖动画没有出现？",
    answer: "首页每 2 秒自动检测新中奖者。请确保：1) 首页页面处于打开状态；2) 浏览器允许页面运行（未被后台挂起）。建议使用 Chrome 浏览器并保持页面在前台。",
  },
];

/* ─────────────── 页面组件 ─────────────── */

export default function GuidePage() {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleStep = (id: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSteps(new Set(steps.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-amber-50/30 to-red-50">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        {/* ── 顶部导航 ── */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.location.href = "/")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              抽奖操作手册
            </h1>
          </div>
        </div>

        {/* ── 引言 ── */}
        <Card className="mb-8 border-red-100 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 bg-red-100 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-gray-700 leading-relaxed">
                  本手册将引导你完成从系统设置到抽奖执行的完整流程。按照下方步骤依次操作，即可顺利举办一场精彩的抽奖活动。
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  全程无需安装任何软件，打开浏览器即可使用。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 快速导航 ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">操作步骤</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="text-amber-700 hover:text-amber-800 text-xs"
              >
                全部展开
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="text-gray-500 hover:text-gray-600 text-xs"
              >
                全部收起
              </Button>
            </div>
          </div>

          {/* ── 步骤列表 ── */}
          <div className="space-y-3">
            {steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              return (
                <Card
                  key={step.id}
                  className={`transition-all duration-200 border-l-4 ${
                    isExpanded
                      ? "border-l-red-500 shadow-md"
                      : "border-l-gray-200 shadow-sm hover:shadow-md"
                  } bg-white/90 backdrop-blur-sm`}
                >
                  {/* 步骤头部 */}
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="w-full text-left p-4 md:p-5 flex items-center gap-4 focus:outline-none"
                  >
                    {/* 步骤编号 */}
                    <div
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${step.color}`}
                    >
                      {step.id}
                    </div>
                    {/* 标题与摘要 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{step.icon}</span>
                        <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                          {step.title}
                        </h3>
                        {step.warning && (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] px-1.5 py-0"
                          >
                            注意
                          </Badge>
                        )}
                        {step.id === 4 && (
                          <Badge
                            variant="outline"
                            className="text-purple-600 border-purple-300 bg-purple-50 text-[10px] px-1.5 py-0"
                          >
                            可选
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">
                        {step.description}
                      </p>
                    </div>
                    {/* 展开箭头 */}
                    <div className="shrink-0 text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {/* 步骤详情 */}
                  {isExpanded && (
                    <div className="px-4 pb-5 md:px-5 md:pb-6">
                      <div className="pl-14 space-y-4">
                        {/* 详细说明 */}
                        <div className="space-y-2.5">
                          {step.details.map((detail, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {detail}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* 提示 */}
                        {step.tip && (
                          <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <p className="text-emerald-800 text-sm leading-relaxed">
                              <span className="font-medium">小贴士：</span>
                              {step.tip}
                            </p>
                          </div>
                        )}

                        {/* 警告 */}
                        {step.warning && (
                          <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-amber-800 text-sm leading-relaxed">
                              <span className="font-medium">注意：</span>
                              {step.warning}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── 流程总览 ── */}
        <Card className="mb-8 border-amber-100 bg-gradient-to-r from-amber-50/80 to-red-50/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              快速流程总览
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { label: "登录后台", icon: <Shield className="w-3.5 h-3.5" /> },
                { label: "设置奖项", icon: <Gift className="w-3.5 h-3.5" /> },
                { label: "添加参与者", icon: <Users className="w-3.5 h-3.5" /> },
                { label: "开始抽奖", icon: <Play className="w-3.5 h-3.5" /> },
                { label: "查看结果", icon: <Trophy className="w-3.5 h-3.5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-amber-200 text-amber-800 font-medium shadow-sm">
                    {item.icon}
                    {item.label}
                  </span>
                  {i < 4 && (
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 常见问题 ── */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            常见问题
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => {
              const isFaqOpen = expandedFaq === i;
              return (
                <Card
                  key={i}
                  className={`transition-all duration-200 ${
                    isFaqOpen ? "shadow-md" : "shadow-sm hover:shadow-md"
                  } bg-white/90 backdrop-blur-sm`}
                >
                  <button
                    onClick={() => setExpandedFaq(isFaqOpen ? null : i)}
                    className="w-full text-left p-4 flex items-center gap-3 focus:outline-none"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      Q
                    </span>
                    <span className="flex-1 font-medium text-gray-800 text-sm">
                      {faq.question}
                    </span>
                    {isFaqOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {isFaqOpen && (
                    <div className="px-4 pb-4 pl-14">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── 重要提醒 ── */}
        <Card className="mb-8 border-red-200 bg-red-50/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h2 className="font-semibold text-red-800 text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              重要提醒
            </h2>
            <div className="space-y-2">
              {[
                "重置操作不可撤销，执行前请确认",
                "已中奖的参与者无法删除，只能通过「重置抽奖」清除中奖记录",
                "同一姓名不可重复报名，重名者请添加区分标识",
                "建议从高价值奖项开始抽奖，逐步推向高潮",
                "现场投屏推荐使用 Chrome 浏览器，保持页面在前台运行",
                "管理员登录有效期 24 小时，超时需重新登录",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                  <p className="text-red-700 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 返回首页 ── */}
        <div className="text-center pt-4 pb-8">
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回抽奖首页
          </Button>
        </div>
      </div>
    </div>
  );
}
