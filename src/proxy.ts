/**
 * Proxy: /(app) と /api（/api/auth/login 除く）でクッキー検証
 * /public と /login はスルー
 * Uses Web Crypto API (Edge Runtime compatible)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cache CryptoKey per secret to avoid re-importing on every request
let cachedKey: CryptoKey | null = null;
let cachedSecret: string | null = null;

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  if (cachedKey && cachedSecret === secret) return cachedKey;
  const enc = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  cachedSecret = secret;
  return cachedKey;
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const enc = new TextEncoder();
  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sig === expected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth needed
  if (
    pathname.startsWith("/public") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/favicon.ico" ||
    /\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check auth for /(app) routes and /api routes
  const needsAuth =
    pathname === "/" ||
    pathname.startsWith("/books") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/discover") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/lab") ||
    pathname.startsWith("/api/");

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  const secret = process.env.APP_SECRET || process.env.APP_PASSWORD || "";

  if (!token || !secret || !(await verifyToken(token, secret))) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Page routes redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
