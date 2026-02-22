import { NextResponse } from "next/server";
import descriptions from "@/lib/concept-descriptions.json";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const concept = searchParams.get("concept");
  if (!concept) return NextResponse.json({ error: "concept required" }, { status: 400 });

  const map = descriptions as Record<string, string>;
  const text = map[concept] ?? null;
  return NextResponse.json({ description: text || null });
}
