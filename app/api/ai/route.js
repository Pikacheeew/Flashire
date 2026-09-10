// Server-side AI route. The DeepSeek API key lives here (from env), never in the browser.
// The frontend calls POST /api/ai; this route calls DeepSeek and returns the text.

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req) {
  try {
    const { prompt, json } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      return Response.json({ error: "Server not configured (no API key)" }, { status: 500 });
    }

    // Build the request. Use JSON mode when the caller expects structured output.
    const body = {
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.4,
    };
    if (json) body.response_format = { type: "json_object" };

    // Call DeepSeek with a simple one-retry on 429 (rate limit).
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status !== 429) break;
      const wait = Number(res.headers.get("retry-after") || 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return Response.json({ error: "AI provider error", detail }, { status: 502 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return Response.json({ text });
  } catch (err) {
    return Response.json({ error: "Request failed", detail: String(err) }, { status: 500 });
  }
}
