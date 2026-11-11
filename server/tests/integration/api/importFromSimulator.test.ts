import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";

// Real sign-in and role checks run; only the session lookup, the database repositories and the face pipeline are faked.
vi.mock("../../../src/auth/SessionService", () => ({
  sessionService: { verify: async (t: string) => (t === "admin" ? { id: "1", email: "a@b.c", role: "ADMIN" } : t === "user" ? { id: "2", email: "u@b.c", role: "USER" } : null) },
}));
const people: any[] = []; const faces: any[] = [];
vi.mock("../../../src/repositories/people.repository", () => ({ peopleRepository: {
  findAllByName: async (n: string) => people.filter((p) => p.name.toLowerCase() === n.toLowerCase()),
  create: async (i: any) => { const p = { id: `p${people.length + 1}`, ...i }; people.push(p); return p; },
  list: async () => people, findById: async () => null, update: async () => null } }));
vi.mock("../../../src/repositories/personFaces.repository", () => ({ personFacesRepository: { create: async (r: any) => { faces.push(r); return r; }, forPerson: async () => [], listForSharing: async () => [{ name: "Asha", category: "GUEST", embedding: [1, 2] }, { name: "asha", category: "GUEST", embedding: [3, 4] }, { name: "Ravi", category: "ADMIN", embedding: [5, 6] }] } }));
vi.mock("../../../src/perception/embedding", () => ({ getEmbeddingBackend: () => ({ name: "faceapi" }) }));
vi.mock("../../../src/perception/faceEmbedding", () => {
  class NoFaceDetectedError extends Error {}
  return { NoFaceDetectedError, computeFaceEmbeddingDetailed: async (b: Buffer) => { if (b.toString() === "noface") throw new NoFaceDetectedError(); return { embedding: [0.1, 0.2], detection: {}, backendName: "test" }; } };
});
vi.mock("../../../src/perception/quality/faceQuality", () => ({ scoreFaceQuality: async (b: Buffer) => (b.toString() === "blurry" ? { isUsable: false, rejectReasons: ["blurry"], overallScore: 0.1 } : { isUsable: true, rejectReasons: [], overallScore: 0.9 }) }));
vi.mock("../../../src/camera/mediaStorage", () => ({ storeMedia: async () => ({ mediaId: "m1", stored: false }) }));
vi.mock("sharp", () => ({ default: () => ({ metadata: async () => ({ width: 160, height: 160 }) }) }));

import { peopleRouter } from "../../../src/routes/people.routes";
const b64 = (s: string) => Buffer.from(s).toString("base64");
function serve() {
  const app = express(); app.use(express.json({ limit: "5mb" })); app.use("/api", peopleRouter);
  return new Promise<{ url: string; close: () => void }>((r) => { const s = app.listen(0, () => r({ url: `http://127.0.0.1:${(s.address() as any).port}/api/people/import-from-simulator`, close: () => s.close() })); });
}
const send = (url: string, body: unknown, token = "admin") => fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

describe("import people taught in the simulator", () => {
  beforeEach(() => { people.length = 0; faces.length = 0; });
  it("is ADMIN-only", async () => { const s = await serve(); try { expect((await send(s.url, { people: [] }, "user")).status).toBe(403); expect((await send(s.url, { people: [] }, "")).status).toBe(401); } finally { s.close(); } });
  it("creates a GUEST person, enrols good photos, reports bad ones, skips unnamed visitors", async () => {
    const s = await serve();
    try {
      const res = await send(s.url, { people: [{ name: "Asha", photos: [b64("ok1"), "data:image/jpeg;base64," + b64("ok2"), b64("blurry"), b64("noface")] }, { name: "Visitor 3", photos: [b64("ok")] }] });
      const { results } = await res.json() as any;
      expect(results[0]).toMatchObject({ name: "Asha", status: "created", enrolled: 2 });
      expect(results[0].failed).toEqual(["quality too low (blurry)", "no face found in the photo"]);
      expect(results[1]).toMatchObject({ status: "skipped", reason: "not named yet" });
      expect(people).toHaveLength(1); expect(people[0]).toMatchObject({ name: "Asha", category: "GUEST" }); expect(faces).toHaveLength(2);
    } finally { s.close(); }
  });
  it("adds to an existing person instead of duplicating, and refuses an ambiguous name", async () => {
    people.push({ id: "p1", name: "Ravi" }); const s = await serve();
    try {
      let r = await (await send(s.url, { people: [{ name: "ravi", photos: [b64("ok")] }] })).json() as any;
      expect(r.results[0]).toMatchObject({ status: "updated", enrolled: 1 }); expect(people).toHaveLength(1);
      people.push({ id: "p2", name: "Ravi" });
      r = await (await send(s.url, { people: [{ name: "Ravi", photos: [b64("ok")] }] })).json() as any;
      expect(r.results[0].status).toBe("skipped");
    } finally { s.close(); }
  });
  it("shares the server's people as face fingerprints with the simulator (grouped by name, ADMIN-only)", async () => {
    const s = await serve(); const url = s.url.replace("import-from-simulator", "face-data");
    try {
      expect((await fetch(url, { headers: { authorization: "Bearer user" } })).status).toBe(403);
      const d = await (await fetch(url, { headers: { authorization: "Bearer admin" } })).json() as any;
      expect(d.backend).toBe("faceapi"); expect(d.people).toHaveLength(2);
      expect(d.people.find((p: any) => p.name === "Asha").faces).toEqual([[1, 2], [3, 4]]);
    } finally { s.close(); }
  });
  it("rejects a body without a list", async () => { const s = await serve(); try { expect((await send(s.url, { people: "x" })).status).toBe(400); } finally { s.close(); } });
});
