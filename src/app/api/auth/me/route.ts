import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Session + profile for the marketing header (client fetch; avoids Supabase in RSC bundles). */
export async function GET() {
  const user = await getUser();
  return NextResponse.json({ user });
}
