// Verifies a Cloudflare Turnstile token server-side. Call this on candidate
// submit BEFORE /api/parse-cv — never spend the paid AI call on spam.
export const runtime = "nodejs";

export async function POST(req) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return Response.json({ ok: false, error: "Missing token" }, { status: 400 });

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return Response.json({ ok: false, error: "Server not configured" }, { status: 500 });

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await res.json();
  return Response.json({ ok: !!data.success });
}
