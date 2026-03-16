import { NextResponse } from "next/server";
import { getActivities } from "@/lib/activityStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const activities = await getActivities();
  return NextResponse.json({ activities });
}
