// CRUD for the open roles an HR workspace is hiring for.
import { getSupabaseAdmin, getUserFromRequest, getCallerWorkspace } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

async function requireWorkspace(req) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const admin = getSupabaseAdmin();
  const workspace = await getCallerWorkspace(admin, user.id);
  if (!workspace) return { error: Response.json({ error: "No workspace" }, { status: 403 }) };
  return { admin, workspace };
}

export async function GET(req) {
  const ctx = await requireWorkspace(req);
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.admin.from("roles").select("*").eq("workspace_id", ctx.workspace.id).order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ roles: data });
}

export async function POST(req) {
  const ctx = await requireWorkspace(req);
  if (ctx.error) return ctx.error;
  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: "Missing name" }, { status: 400 });
  const { data, error } = await ctx.admin
    .from("roles")
    .insert({ workspace_id: ctx.workspace.id, name: name.trim() })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ role: data });
}
