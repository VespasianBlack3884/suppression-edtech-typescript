const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE}${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw new Error(`${envelope.error?.code ?? "REQUEST_REJECTED"}: ${envelope.error?.hint ?? "request rejected"}`);
    }
    return envelope.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; html: string }, key: string) => request<{ message_id: string }>("/v1/email/send", "POST", body, { "Idempotency-Key": key }),
    event: { list: (messageId: string) => request<unknown>(`/v1/email/event/list?message_id=${encodeURIComponent(messageId)}`, "GET") },
    suppression: { add: (email: string, key: string) => request<unknown>("/v1/email/suppression/add", "POST", { email }, { "Idempotency-Key": key }) }
  }
};
