import { NextRequest, NextResponse } from "next/server";

// 管理员账户和密码（优先从环境变量读取，默认值仅用于本地演示）
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 验证参数
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证用户名和密码
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      return NextResponse.json({
        success: true,
        message: "登录成功",
      });
    }

    return NextResponse.json(
      { success: false, error: "用户名或密码错误" },
      { status: 401 }
    );
  } catch (error) {
    console.error("管理员登录错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
