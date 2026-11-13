/**
 * Telegram → Grok Bot routine webhook relay (Cloudflare Worker).
 *
 * Research/planning copy only. Placeholders — never put real secrets in this file.
 *
 * Required Worker secrets (Cloudflare dashboard → Worker → Settings →
 * Variables and Secrets → add as type Secret, then Deploy):
 *   SHARED_SECRET  Same value passed to Telegram setWebhook as secret_token.
 *                  Telegram will send it on every update as the header
 *                  X-Telegram-Bot-Api-Secret-Token.
 *   ROUTINE_URL    The webhook URL copied from the Grok Bot routine panel.
 *   SENDER_KEY     The sender key copied from the same routine panel.
 *
 * Optional plain variables (not secrets), only if the default key format is wrong:
 *   SENDER_KEY_MODE  "authorization-bearer" (default) | "header" | "query"
 *   SENDER_KEY_NAME  Header or query-parameter name, required for "header" or "query".
 *
 * UNKNOWN: The routines skill documents a webhook trigger { "type": "webhook" }
 * and says the user copies the URL and sender key from the routine panel. It
 * does not name the header, query parameter, or body field the sender key must
 * use. "authorization-bearer" is a guess, not a documented fact. Change
 * SENDER_KEY_MODE / SENDER_KEY_NAME after checking the routine panel, without
 * pasting the key into chat.
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    const expected = env.SHARED_SECRET;
    const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!expected || !secretsEqual(provided, expected)) {
      return new Response("unauthorized", { status: 401 });
    }

    if (!env.ROUTINE_URL || !env.SENDER_KEY) {
      return new Response("relay not configured", { status: 500 });
    }

    let dest;
    try {
      dest = new URL(env.ROUTINE_URL);
    } catch {
      return new Response("ROUTINE_URL is not a valid URL", { status: 500 });
    }

    const headers = new Headers({
      "Content-Type": request.headers.get("Content-Type") || "application/json",
    });

    const mode = (env.SENDER_KEY_MODE || "authorization-bearer").toLowerCase();
    if (mode === "authorization-bearer") {
      headers.set("Authorization", "Bearer " + env.SENDER_KEY);
    } else if (mode === "header") {
      const name = env.SENDER_KEY_NAME;
      if (!name) {
        return new Response("SENDER_KEY_NAME missing", { status: 500 });
      }
      headers.set(name, env.SENDER_KEY);
    } else if (mode === "query") {
      const name = env.SENDER_KEY_NAME;
      if (!name) {
        return new Response("SENDER_KEY_NAME missing", { status: 500 });
      }
      dest.searchParams.set(name, env.SENDER_KEY);
    } else {
      return new Response("unknown SENDER_KEY_MODE", { status: 500 });
    }

    const body = await request.arrayBuffer();

    const forwarded = await fetch(dest.toString(), {
      method: "POST",
      headers,
      body,
    });

    // 2xx back to Telegram only if the routine accepted the POST, so Telegram
    // retries when the routine is down. The routine should treat repeated
    // update_id values as duplicates.
    if (forwarded.ok) {
      return new Response("ok", { status: 200 });
    }
    return new Response("upstream error", { status: 502 });
  },
};

function secretsEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  const len = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= (left[i] || 0) ^ (right[i] || 0);
  }
  return mismatch === 0;
}
