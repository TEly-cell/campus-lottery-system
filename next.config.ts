import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 生产环境监听所有网卡，便于反向代理访问
  poweredByHeader: false,
};

export default nextConfig;
