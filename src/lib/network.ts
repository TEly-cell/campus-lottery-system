import { networkInterfaces } from 'os';

/**
 * 获取本机的局域网IP地址
 */
export function getLocalIP(): string {
  const nets = networkInterfaces();
  const results: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // 跳过内部IP和非IPv4地址
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }

  // 返回找到的第一个IP地址
  return results[0] || '0.0.0.0';
}

/**
 * 获取当前可用的访问地址
 */
export function getAccessibleUrls(port: number = 5000): {
  localhost: string;
  lan: string;
  custom?: string;
} {
  const localIP = getLocalIP();
  
  return {
    localhost: `http://localhost:${port}`,
    lan: `http://${localIP}:${port}`,
  };
}
