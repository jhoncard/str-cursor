import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Session + profile for the marketing header (client fetch; avoids Supabase in RSC bundles). */
export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({ user });
  } catch (e) {
    console.error("[api/auth/me] failed:", e);
    return NextResponse.json({ user: null });
  }
}
