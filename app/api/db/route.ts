import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Direct database endpoint is disabled for security." },
    { status: 403 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Direct database endpoint is disabled for security." },
    { status: 403 }
  );
}
