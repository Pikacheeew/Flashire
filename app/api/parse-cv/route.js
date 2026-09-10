// Real CV parsing (replaces simulateParse). Flow: client already uploaded the
// file to Supabase Storage bucket `cvs` at `{user_id}/{filename}`; this route
// downloads it (service role — storage RLS only lets the owner read/write),
// extracts text, and asks DeepSeek to classify + extract structured fields.
import { getSupabaseAdmin, getUserFromRequest } from "../../../lib/supabaseAdmin";
import { deepseekJson } from "../../../lib/ai";

export const runtime = "nodejs";

async function extractText(buffer, filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const { text } = await pdfParse(buffer);
    return text;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  throw new Error("Unsupported file type");
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { path } = await req.json().catch(() => ({}));
  if (!path) return Response.json({ error: "Missing path" }, { status: 400 });
  if (!path.startsWith(`${user.id}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: blob, error: dlErr } = await admin.storage.from("cvs").download(path);
  if (dlErr) return Response.json({ error: "Could not read uploaded file" }, { status: 400 });

  let text;
  try {
    const buffer = Buffer.from(await blob.arrayBuffer());
    text = await extractText(buffer, path);
  } catch {
    return Response.json({ error: "lowquality" });
  }

  if (!text || text.trim().length < 100) {
    return Response.json({ error: "lowquality" });
  }

  const prompt = `You are a CV parser. Read the CV text below and return ONLY a JSON object:
{
  "is_cv": boolean,
  "full_name": string|null,
  "email": string|null,
  "phone": string|null,
  "title": string|null,
  "years": number|null,
  "city": string|null,
  "summary": string
}
No prose, no markdown. CV text:
---
${text.slice(0, 12000)}
---`;

  let parsed;
  try {
    parsed = await deepseekJson(prompt);
  } catch {
    return Response.json({ error: "Parsing failed, try again" }, { status: 502 });
  }

  if (!parsed.is_cv) return Response.json({ error: "wrong" });
  admin.from("usage_events").insert({ workspace_id: null, kind: "parse" }).then(() => {});
  return Response.json({ fields: parsed });
}
