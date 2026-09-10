// Server-only AI helpers: DeepSeek chat/JSON calls and OpenAI embeddings.
// Never import from a "use client" component.

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";

export async function deepseekChat(prompt, { json = false } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not configured");

  const body = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.4,
  };
  if (json) body.response_format = { type: "json_object" };

  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    const wait = Number(res.headers.get("retry-after") || 1) * 1000;
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek error ${res.status}: ${detail}`);
  }
  const data = await res.json();
  let text = data?.choices?.[0]?.message?.content ?? "";
  if (json) text = text.replace(/```json|```/g, "").trim();
  return text;
}

export async function deepseekJson(prompt) {
  return JSON.parse(await deepseekChat(prompt, { json: true }));
}

// 1536-dim vector, matching the `vector(1536)` column in the schema.
export async function embedText(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding error ${res.status}: ${detail}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}
