import { NextResponse } from "next/server";

export async function parseJsonBody(
  req: Request
): Promise<[any, null] | [null, NextResponse]> {
  try {
    const body = await req.json();
    return [body, null];
  } catch {
    return [
      null,
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    ];
  }
}
