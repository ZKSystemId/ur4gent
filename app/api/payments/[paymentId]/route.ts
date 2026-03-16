import { NextResponse } from "next/server";
import { updatePayment, deletePaymentById } from "@/services/paymentService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const body = await request.json();
  const data: Partial<{
    recipientAddress: string;
    amount: number;
    token: string;
    category: string;
    executionType: string;
    scheduleAt: Date | null;
    recurringInterval: string | null;
    description: string | null;
  }> = {};
  if (body.recipientAddress !== undefined) data.recipientAddress = body.recipientAddress;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.token !== undefined) data.token = body.token;
  if (body.category !== undefined) data.category = body.category;
  if (body.executionType !== undefined) data.executionType = body.executionType;
  if (body.scheduleAt !== undefined) data.scheduleAt = body.scheduleAt ? new Date(body.scheduleAt) : null;
  if (body.recurringInterval !== undefined) data.recurringInterval = body.recurringInterval;
  if (body.description !== undefined) data.description = body.description;

  const updated = await updatePayment(paymentId, data);
  return NextResponse.json({ success: true, payment: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  await deletePaymentById(paymentId);
  return NextResponse.json({ success: true });
}
