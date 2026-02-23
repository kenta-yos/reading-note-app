import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const publishers = await prisma.watchPublisher.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(publishers);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const publisher = await prisma.watchPublisher.create({ data: { name } });
    return NextResponse.json(publisher, { status: 201 });
  } catch {
    return NextResponse.json({ error: "already exists" }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.watchPublisher.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
