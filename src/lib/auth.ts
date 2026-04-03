import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: "guest" | "admin";
};

export async function getUser(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select({
      role: profiles.role,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      profile?.fullName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      null,
    avatarUrl:
      profile?.avatarUrl ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
    role: profile?.role ?? "guest",
  };
}

export async function requireUser(): Promise<UserProfile> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<UserProfile> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function requireAdminPage(): Promise<UserProfile> {
  const user = await getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard?notice=not_admin");
  }

  return user;
}
