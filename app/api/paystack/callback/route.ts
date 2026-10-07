import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  if (reference) {
    return NextResponse.redirect(`${origin}/receipt/${encodeURIComponent(reference)}`);
  }

  return NextResponse.redirect(`${origin}/track`);
}
