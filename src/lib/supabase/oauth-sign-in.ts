import { createClient } from "@/lib/supabase/client";

export async function oauthSignInAndRedirect(
  provider: "google" | "apple",
  callbackUrl: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
      ...(provider === "google"
        ? {
            scopes: "email profile openid",
            queryParams: {
              access_type: "offline",
              prompt: "select_account",
            },
          }
        : {}),
    },
  });

  if (error) {
    return {
      ok: false,
      message: `${error.message}${error.name ? ` (${error.name})` : ""}`,
    };
  }

  if (!data.url) {
    return {
      ok: false,
      message:
        "Supabase did not return a sign-in URL. Confirm Authentication → Providers → Google is enabled, Client ID and Secret are saved, then try again.",
    };
  }

  window.location.assign(data.url);
  return { ok: true };
}
