// Server-only Supabase client. Uses the service_role key, which bypasses RLS.
// NEVER import this from a "use client" component — it would leak the key to the browser.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// Resolves the calling user from the "Authorization: Bearer <access_token>" header
// that the client attaches (the Supabase session's access token). Returns null if
// missing/invalid — callers should treat that as unauthenticated.
export async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// The workspace the calling HR user belongs to (first membership), or null.
export async function getCallerWorkspace(admin, userId) {
  const { data, error } = await admin
    .from("memberships")
    .select("workspace_id, workspaces(id, name, is_verified)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.workspaces;
}
