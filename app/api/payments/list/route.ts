import { NextResponse } from "next/server";
import { getPayments } from "@/services/paymentService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") || undefined;
  
  const payments = await getPayments(agentId);
  return NextResponse.json({ payments });
}
