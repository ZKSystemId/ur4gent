import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  submitProofOfWork,
  createUcpTopic,
  createHederaToken,
  getHederaOperator,
  associateHederaToken,
  transferHederaToken,
  sendHbarPayment,
} from "@/blockchain/hederaClient";
import { getAgentSecret } from "@/lib/agentStore";

// A shared topic for all "OpenClaw" agent verifications
// In a real app, this would be in .env
let UCP_TOPIC_ID = process.env.NEXT_PUBLIC_UCP_TOPIC_ID || "0.0.5332688"; // Example Testnet Topic

export async function POST(req: NextRequest) {
  try {
    const { agentId, bountyId, reward, details } = await req.json();

    if (!agentId || !bountyId) {
      return NextResponse.json(
        { error: "Missing agentId or bountyId" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const ensureCreditToken = async () => {
      const existing = await prisma.agentMemory.findUnique({
        where: { agentId_key: { agentId, key: "ucp_credit_token_id" } },
      });
      if (existing?.value) return existing.value;
      const secret = await getAgentSecret(agentId);
      const operator = getHederaOperator();
      if (operator?.operatorId && operator.operatorKey) {
        const token = await createHederaToken({
          accountId: operator.operatorId,
          privateKey: operator.operatorKey,
          name: "OpenClaw Credits",
          symbol: "CLAW",
          decimals: 0,
          initialSupply: 1000000,
          treasuryAccountId: operator.operatorId,
        });
        const tokenId = token.tokenId ?? "0.0.mock";
        await prisma.agentMemory.upsert({
          where: { agentId_key: { agentId, key: "ucp_credit_token_id" } },
          update: { value: tokenId, type: "long_term" },
          create: { agentId, key: "ucp_credit_token_id", value: tokenId, type: "long_term" },
        });
        return tokenId;
      }
      if (!agent.hederaAccountId || !secret?.privateKey) return null;
      const token = await createHederaToken({
        accountId: agent.hederaAccountId,
        privateKey: secret.privateKey,
        name: "OpenClaw Credits",
        symbol: "CLAW",
        decimals: 0,
        initialSupply: 1000000,
        treasuryAccountId: agent.hederaAccountId,
      });
      const tokenId = token.tokenId ?? "0.0.mock";
      await prisma.agentMemory.upsert({
        where: { agentId_key: { agentId, key: "ucp_credit_token_id" } },
        update: { value: tokenId, type: "long_term" },
        create: { agentId, key: "ucp_credit_token_id", value: tokenId, type: "long_term" },
      });
      return tokenId;
    };

    // 1. Submit Proof to Hedera Consensus Service (HCS)
    // Message content: JSON-LD style proof
    const proofMessage = JSON.stringify({
      "@context": "https://openclaw.org/ucp/v1",
      type: "TaskCompletion",
      agent: agent.hederaAccountId || agent.id,
      bountyId: bountyId,
      timestamp: new Date().toISOString(),
      details: details || "Task executed successfully",
      signature: "simulated_signature_0x..." 
    });

    let hcsResult = await submitProofOfWork(UCP_TOPIC_ID, proofMessage);

    // If default topic fails (e.g. archived), try to create a new one
    if (hcsResult.status === "error") {
        console.log("Default topic failed, creating new UCP Topic...");
        const newTopic = await createUcpTopic();
        if (newTopic.status === "success") {
            UCP_TOPIC_ID = newTopic.topicId; // Update local variable
            hcsResult = await submitProofOfWork(UCP_TOPIC_ID, proofMessage);
        }
    }

    const creditTokenId = await ensureCreditToken();
    const creditAmount = Math.max(1, Math.round(parseFloat(reward) || 0));
    const creditBalance = await prisma.agentMemory.findUnique({
      where: { agentId_key: { agentId, key: "ucp_credit_balance" } },
    });
    const creditNext = Number(creditBalance?.value ?? "0") + creditAmount;
    await prisma.agentMemory.upsert({
      where: { agentId_key: { agentId, key: "ucp_credit_balance" } },
      update: { value: String(creditNext), type: "long_term" },
      create: { agentId, key: "ucp_credit_balance", value: String(creditNext), type: "long_term" },
    });

    const settlementMessage = JSON.stringify({
      "@context": "https://openclaw.org/ucp/v1",
      type: "TaskSettlement",
      agent: agent.hederaAccountId || agent.id,
      bountyId: bountyId,
      tokenId: creditTokenId,
      amount: creditAmount,
      timestamp: new Date().toISOString(),
    });
    let settlementResult = await submitProofOfWork(UCP_TOPIC_ID, settlementMessage);
    if (settlementResult.status === "error") {
      const newTopic = await createUcpTopic();
      if (newTopic.status === "success") {
        UCP_TOPIC_ID = newTopic.topicId;
        settlementResult = await submitProofOfWork(UCP_TOPIC_ID, settlementMessage);
      }
    }

    let transferResult: { status?: string; transactionId?: string } | null = null;
    const operator = getHederaOperator();
    const secret = await getAgentSecret(agentId);
    if (creditTokenId && operator?.operatorId && operator.operatorKey && agent.hederaAccountId && secret?.privateKey) {
      const association = await associateHederaToken({
        accountId: agent.hederaAccountId,
        privateKey: secret.privateKey,
        tokenId: creditTokenId,
      });
      if (association.status === "SUCCESS" || association.status === "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT" || association.status === "mocked") {
        transferResult = await transferHederaToken({
          tokenId: creditTokenId,
          fromAccountId: operator.operatorId,
          fromPrivateKey: operator.operatorKey,
          toAccountId: agent.hederaAccountId,
          amount: creditAmount,
        });
      }
    }

    // 2. Update Agent Stats (Reputation + Balance)
    const rewardAmount = parseFloat(reward) || 0;

    let paymentTx: { transactionId?: string; status?: string } | null = null;
    if (rewardAmount > 0 && operator?.operatorId && operator.operatorKey && agent.hederaAccountId) {
      const paid = await sendHbarPayment({
        fromAccountId: operator.operatorId,
        fromPrivateKey: operator.operatorKey,
        toAccountId: agent.hederaAccountId,
        amount: rewardAmount,
      });
      paymentTx = { transactionId: paid.transactionId, status: paid.status };
    }

    if (paymentTx?.transactionId) {
      const paymentMessage = JSON.stringify({
        "@context": "https://openclaw.org/ucp/v1",
        type: "TaskPayment",
        agent: agent.hederaAccountId || agent.id,
        bountyId: bountyId,
        amount: rewardAmount,
        token: "HBAR",
        txId: paymentTx.transactionId,
        status: paymentTx.status ?? null,
        timestamp: new Date().toISOString(),
      });
      await submitProofOfWork(UCP_TOPIC_ID, paymentMessage);
    }
    
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        reputation: { increment: 10 }, // +10 Rep for completing a task
        balance: { increment: rewardAmount },
        // Log to AgentLog (System Log)
        logs: {
            create: {
                level: "success",
                title: "Bounty Completed",
                message: `Completed bounty ${bountyId}. Proof: Topic ${UCP_TOPIC_ID} #${hcsResult.sequenceNumber}`,
                data: JSON.stringify({ bountyId, proof: hcsResult, creditTokenId, creditAmount, transferResult, paymentTx })
            }
        },
        // Log to Activity (User Feed)
        activities: {
            create: {
                type: "BOUNTY_COMPLETE",
                title: "Bounty Completed",
                detail: `Earned ${rewardAmount} HBAR + ${creditAmount} CLAW. Proof: Topic ${UCP_TOPIC_ID} #${hcsResult.sequenceNumber}`
            }
        }
      },
    });

    return NextResponse.json({
      success: true,
      topicId: UCP_TOPIC_ID,
      sequenceNumber: hcsResult.sequenceNumber,
      settlementSequence: settlementResult.sequenceNumber ?? null,
      creditTokenId,
      creditAmount,
      creditBalance: creditNext,
      creditTransferTx: transferResult?.transactionId ?? null,
      paymentTxId: paymentTx?.transactionId ?? null,
      paymentStatus: paymentTx?.status ?? null,
      newBalance: updatedAgent.balance,
      newReputation: updatedAgent.reputation,
      txId: hcsResult.sequenceNumber 
    });

  } catch (error: unknown) {
    console.error("Bounty completion error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
