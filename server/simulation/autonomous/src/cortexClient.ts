import type { CortexRequest, Decision } from "./brain.js";

export interface Health {
  llm: { configured: boolean; provider: string; model: string; vision: boolean };
  limits: { thinksPerMinute: number };
}

export async function fetchHealth(): Promise<Health | null> {
  try { const r = await fetch("/api/simulation/consciousness/health"); return r.ok ? ((await r.json()) as Health) : null; } catch { return null; }
}

/** Ask the server-side cortex (LLM) what to do next. Throws on any failure. */
export async function askCortex(request: CortexRequest, frame: string | null): Promise<Decision> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch("/api/simulation/consciousness/think", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, frame }), signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `server ${res.status}`);
    return data.decision as Decision;
  } finally { clearTimeout(timer); }
}

/** Per-user saved mind (needs a logged-in dashboard session; silently null otherwise). */
export async function loadMindState(): Promise<any | null> {
  try { const r = await fetch("/api/simulation/mind-state", { credentials: "same-origin" }); if (!r.ok) return null; const d = await r.json(); return d.state ?? null; } catch { return null; }
}
export async function saveMindState(state: unknown, keepalive = false): Promise<boolean> {
  try {
    const r = await fetch("/api/simulation/mind-state", { method: "PUT", credentials: "same-origin", keepalive, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
    return r.ok;
  } catch { return false; }
}
export async function deleteMindState(): Promise<void> {
  try { await fetch("/api/simulation/mind-state", { method: "DELETE", credentials: "same-origin" }); } catch { /* ignore */ }
}

export interface PeopleSyncResult { name: string; status: string; enrolled?: number; failed?: string[]; reason?: string }
/** Send taught people (name + face photos) to the server's People list, which the real robot also uses. Needs an admin session. */
export async function sendPeople(people: { name: string; photos: string[] }[]): Promise<{ ok: boolean; status: number; results: PeopleSyncResult[] }> {
  try {
    const r = await fetch("/api/people/import-from-simulator", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ people }) });
    const d = r.ok ? await r.json() : null;
    return { ok: r.ok, status: r.status, results: d?.results ?? [] };
  } catch { return { ok: false, status: 0, results: [] }; }
}

/** The people the server knows, as face fingerprints (same people the real robot recognises). Needs an admin session. */
export async function fetchSharedPeople(): Promise<{ backend: string; people: { name: string; descriptors: number[][] }[] } | null> {
  try {
    const r = await fetch("/api/people/face-data", { credentials: "same-origin" });
    if (!r.ok) return null;
    const d = await r.json();
    return { backend: String(d.backend ?? ""), people: (d.people ?? []).map((p: any) => ({ name: String(p.name), descriptors: p.faces ?? [] })) };
  } catch { return null; }
}
