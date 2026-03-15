import { NextResponse } from "next/server";
import { getQueueStatus } from "@/lib/ai/queue";

export async function GET() {
  return NextResponse.json(getQueueStatus());
}
