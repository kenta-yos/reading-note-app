import { NextResponse } from "next/server";
import { getStatsForYear } from "@/lib/stats";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const stats = await getStatsForYear(year);
  return NextResponse.json(stats);
}
