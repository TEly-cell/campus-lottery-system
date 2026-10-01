import { NextResponse } from "next/server";
import { getLocalIP } from "@/lib/network";

// GET /api/system/network - 获取网络信息
export async function GET() {
  try {
    const localIP = getLocalIP();
    const port = process.env.PORT || 5000;

    return NextResponse.json({
      success: true,
      data: {
        localhost: `http://localhost:${port}`,
        lan: `http://${localIP}:${port}`,
        localIP,
        port,
      },
    });
  } catch (error) {
    console.error("获取网络信息失败:", error);
    return NextResponse.json(
      { success: false, error: "获取网络信息失败" },
      { status: 500 }
    );
  }
}
