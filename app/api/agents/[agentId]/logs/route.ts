import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  
  const logs = await prisma.agentLog.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  
  // Delete all logs for this agent
  await prisma.agentLog.deleteMany({
    where: { agentId }
  });

  return NextResponse.json({ success: true });
}
