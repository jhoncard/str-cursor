/** Shared user shape for header / client; keep free of `server-only`. */
export type UserProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: "guest" | "admin";
};
