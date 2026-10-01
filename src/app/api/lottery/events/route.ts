import { NextRequest } from "next/server";

interface LotteryEvent {
  type: "start" | "rolling" | "stop" | "reset" | "clear";
  data?: any;
}

// 存储所有活跃的SSE连接
const clients = new Map<string, ReadableStreamDefaultController>();

/**
 * 发送事件给所有连接的客户端
 */
export function broadcastEvent(event: LotteryEvent) {
  const message = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((controller, clientId) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  });
}

/**
 * GET /api/lottery/events - SSE端点，实时推送抽奖状态
 */
export async function GET(request: NextRequest) {
  const clientId = `${Date.now()}-${Math.random()}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 注册客户端
      clients.set(clientId, controller);

      // 发送连接成功消息
      const welcomeMessage = `data: ${JSON.stringify({
        type: "connected",
        clientId,
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(encoder.encode(welcomeMessage));

      // 心跳保活（每15秒发送一次）
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          clearInterval(heartbeatInterval);
          clients.delete(clientId);
        }
      }, 15000);

      // 客户端断开时清理
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        clients.delete(clientId);
      });
    },
    cancel() {
      clients.delete(clientId);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
