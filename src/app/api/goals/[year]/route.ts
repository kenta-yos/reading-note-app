import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const goal = await prisma.annualGoal.findUnique({
    where: { year: parseInt(year) },
  });
  return NextResponse.json(goal ?? null);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  try {
    const { pageGoal } = await req.json();
    const goal = await prisma.annualGoal.upsert({
      where: { year: parseInt(year) },
      update: { pageGoal: Number(pageGoal) },
      create: { year: parseInt(year), pageGoal: Number(pageGoal) },
    });
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: "保存失敗" }, { status: 500 });
  }
}
