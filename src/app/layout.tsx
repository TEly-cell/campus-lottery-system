import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '新年抽奖',
    template: '%s | 新年抽奖',
  },
  description: '新年抽奖活动：在线扫码报名、实时开奖、中奖记录查询。',
  keywords: ['新年抽奖', '抽奖', '年会抽奖', '在线抽奖'],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
