import { NextResponse } from "next/server";
import { getAvailableYears } from "@/lib/stats";

export async function GET() {
  const years = await getAvailableYears();
  // 現在年が含まれていない場合でも選択できるよう追加
  const currentYear = new Date().getFullYear();
  const allYears = [...new Set([...years, currentYear])].sort((a, b) => b - a);
  return NextResponse.json(allYears);
}
