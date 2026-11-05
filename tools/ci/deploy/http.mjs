// Small HTTP helpers for the deploy scripts (Node built-ins only, so CD needs
// no npm install).

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function request(url, { method = "GET", headers = {}, body, timeoutMs = 15000, redirect = "follow" } = {}) {
  const res = await fetch(url, {
    method,
    headers,
    body,
    redirect,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, ok: res.ok, url: res.url, redirected: res.redirected, text, json };
}

// Retry fn() until check(result) is true. Returns the last result either way.
export async function retry(fn, { attempts = 6, intervalMs = 10000, check = (r) => r.ok } = {}) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      last = await fn();
    } catch (err) {
      last = { ok: false, status: 0, error: err.message };
    }
    if (check(last)) return last;
    if (i < attempts) await sleep(intervalMs);
  }
  return last;
}
