import { NextResponse } from "next/server";
import { createPayment } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Creating payment with body:", JSON.stringify(body, null, 2));
    const payment = await createPayment(body);
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
