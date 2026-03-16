import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submitProofOfWork, createUcpTopic } from "@/blockchain/hederaClient";

let UCP_TOPIC_ID = process.env.NEXT_PUBLIC_UCP_TOPIC_ID || "0.0.5332688";

export async function POST(req: NextRequest) {
  try {
    const { agentId, bountyId, step, status, collateral } = (await req.json()) as {
      agentId?: string;
      bountyId?: string;
      step?: string;
      status?: string;
      collateral?: number;
    };

    if (!agentId || !bountyId || !step) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const proofMessage = JSON.stringify({
      "@context": "https://openclaw.org/ucp/v1",
      type: "TaskAttestation",
      agent: agent.hederaAccountId || agent.id,
      bountyId,
      step,
      status: status ?? "in_progress",
      timestamp: new Date().toISOString(),
    });

    if (status === "collateral") {
      const locked = await prisma.agentMemory.findUnique({
        where: { agentId_key: { agentId, key: "ucp_collateral_locked" } },
      });
      const nextLocked = Number(locked?.value ?? "0") + Number(collateral ?? 0);
      await prisma.agentMemory.upsert({
        where: { agentId_key: { agentId, key: "ucp_collateral_locked" } },
        update: { value: String(nextLocked), type: "long_term" },
        create: { agentId, key: "ucp_collateral_locked", value: String(nextLocked), type: "long_term" },
      });
      await prisma.agentLog.create({
        data: {
          agentId,
          level: "info",
          title: "Collateral Locked",
          message: `Locked ${Number(collateral ?? 0)} HBAR collateral for bounty ${bountyId}`,
        },
      });
    }

    let hcsResult = await submitProofOfWork(UCP_TOPIC_ID, proofMessage);
    if (hcsResult.status === "error") {
      const newTopic = await createUcpTopic();
      if (newTopic.status === "success") {
        UCP_TOPIC_ID = newTopic.topicId;
        hcsResult = await submitProofOfWork(UCP_TOPIC_ID, proofMessage);
      }
    }

    return NextResponse.json({
      success: hcsResult.status !== "error",
      topicId: UCP_TOPIC_ID,
      sequenceNumber: hcsResult.sequenceNumber ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
