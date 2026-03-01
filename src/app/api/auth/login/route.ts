/**
 * POST /api/auth/login
 * パスワード照合 → HttpOnly セッションクッキー設定
 */
import { NextResponse } from "next/server";
import { createHmac } from "crypto";

function signToken(payload: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    return NextResponse.json(
      { error: "APP_PASSWORD が設定されていません" },
      { status: 500 }
    );
  }

  if (!password || password !== appPassword) {
    return NextResponse.json(
      { error: "パスワードが違います" },
      { status: 401 }
    );
  }

  const secret = process.env.APP_SECRET || appPassword;
  const payload = Buffer.from(
    JSON.stringify({ loggedIn: true, iat: Date.now() })
  ).toString("base64url");
  const token = signToken(payload, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
