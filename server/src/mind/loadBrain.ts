import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * The robot's mind is NOT rewritten for the server: the exact same files the simulator runs in the browser
 * (server/simulation/autonomous/js/brain.js and limbic.js) are loaded here, so there is one brain and one set of decisions.
 * Those files are plain ES modules; `simulation/autonomous/js/package.json` ({"type":"module"}) tells Node so.
 */
// A real dynamic import (TypeScript would turn a normal import() into require(), which cannot load ES modules).
const nativeImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;

async function importFile(url: string) {
  try { return await nativeImport(url); }
  catch (err) {
    // Test runners (vitest) run code in a sandbox where the line above is not allowed; their own import() works there.
    if (String(err).includes("dynamic import callback")) return import(/* @vite-ignore */ url);
    throw err;
  }
}

export function brainDir(): string {
  const candidates = [
    process.env.MIND_BRAIN_DIR,
    path.resolve(__dirname, "../../simulation/autonomous/js"),       // src/mind or dist/mind -> server/simulation
    path.resolve(process.cwd(), "simulation/autonomous/js"),
  ].filter(Boolean) as string[];
  const found = candidates.find((d) => fs.existsSync(path.join(d, "brain.js")));
  if (!found) throw new Error(`The shared brain files were not found (looked in: ${candidates.join(", ")})`);
  return found;
}

/** The brain keeps small notes in `localStorage` (a browser feature). The server gives it a plain in-memory one. */
export const mindStorage = (() => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
  };
})();

let cached: Promise<{ Brain: any; Limbic: any; CHEMS: any[] }> | null = null;
export function loadBrainModules() {
  if (!cached) {
    cached = (async () => {
      const g = globalThis as any;
      if (!g.localStorage) g.localStorage = mindStorage;
      const dir = brainDir();
      const [b, l, c] = await Promise.all([importFile(pathToFileURL(path.join(dir, "brain.js")).href), importFile(pathToFileURL(path.join(dir, "limbic.js")).href), importFile(pathToFileURL(path.join(dir, "brainsim", "chem.js")).href)]);
      return { Brain: b.Brain, Limbic: l.Limbic, CHEMS: c.CHEMS };
    })();
    cached.catch(() => { cached = null; });
  }
  return cached;
}
