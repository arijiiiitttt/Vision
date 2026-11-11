import { describe, it, expect, afterAll, vi } from "vitest";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mindengine-"));
process.env.MIND_ENGINE_FILE = path.join(dir, "mind-engine.json");
vi.mock("../../../src/auth/SessionService", () => ({
  sessionService: { verify: async (t: string) => (t === "admin" ? { id: "1", email: "a@b.c", role: "ADMIN" } : t === "user" ? { id: "2", email: "u@b.c", role: "USER" } : null) },
}));
import { systemRouter } from "../../../src/routes/system.routes";
import { mindEngine } from "../../../src/mind";
import { robotModeService } from "../../../src/robot/RobotModeService";
import { simulatedRobot } from "../../../src/robot/SimulatedRobot";
import { setLiveFeed, clearLiveFeeds } from "../../../src/mind/liveFeed";

function serve() {
  const app = express(); app.use(express.json()); app.use("/api", systemRouter);
  return new Promise<{ url: string; close: () => void }>((r) => { const s = app.listen(0, () => r({ url: `http://127.0.0.1:${(s.address() as any).port}/api`, close: () => s.close() })); });
}
const call = (url: string, p: string, method: string, body?: unknown, token = "admin") => fetch(url + p, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });

describe("choosing the robot's brain from the dashboard", () => {
  afterAll(() => { robotModeService.set("simulation"); simulatedRobot.stop(); });
  it("anyone signed in can see which brain is running", async () => {
    mindEngine.set("shared");                       // (in production this is the default; tests start on classic)
    const s = await serve();
    try {
      const r = await (await call(s.url, "/system/mind", "GET", undefined, "user")).json() as any;
      expect(r).toMatchObject({ engine: "shared", running: false, mind: null });
      expect((await call(s.url, "/system/mind", "GET", undefined, "")).status).toBe(401);
    } finally { s.close(); }
  });
  it("only an ADMIN can switch, and the choice is remembered", async () => {
    const s = await serve();
    try {
      expect((await call(s.url, "/system/mind-engine", "POST", { engine: "classic" }, "user")).status).toBe(403);
      expect((await call(s.url, "/system/mind-engine", "POST", { engine: "classic" }, "")).status).toBe(401);
      expect((await call(s.url, "/system/mind-engine", "POST", { engine: "nope" })).status).toBe(400);
      expect(await (await call(s.url, "/system/mind-engine", "POST", { engine: "classic" })).json()).toMatchObject({ engine: "classic" });
      expect(JSON.parse(fs.readFileSync(process.env.MIND_ENGINE_FILE!, "utf8")).engine).toBe("classic");
      mindEngine.set("shared");
    } finally { s.close(); }
  });
  it("the live page gets the robot's latest picture and sensor reading (and needs a login)", async () => {
    clearLiveFeeds();
    const s = await serve();
    try {
      expect((await call(s.url, "/system/mind/live", "GET", undefined, "")).status).toBe(401);
      expect((await call(s.url, "/system/mind/frame", "GET", undefined, "")).status).toBe(401);
      expect(await (await call(s.url, "/system/mind/live", "GET", undefined, "user")).json()).toMatchObject({ camera: null, mind: null });
      expect((await call(s.url, "/system/mind/frame", "GET", undefined, "user")).status).toBe(404);
      setLiveFeed({ robotId: "r1", at: Date.now(), jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), frameWidth: 320, frameHeight: 240, personDetected: true, personName: "Asha", objects: [{ name: "cup", confidence: 0.8 }], motion: 0.2, brightness: 0.6, ultrasonicMm: 900 });
      const live = await (await call(s.url, "/system/mind/live", "GET", undefined, "user")).json() as any;
      expect(live.camera).toMatchObject({ robotId: "r1", hasFrame: true, personName: "Asha", ultrasonicMm: 900 });
      const img = await call(s.url, "/system/mind/frame", "GET", undefined, "user");
      expect(img.status).toBe(200);
      expect(img.headers.get("content-type")).toBe("image/jpeg");
      expect((await img.arrayBuffer()).byteLength).toBe(4);
    } finally { s.close(); clearLiveFeeds(); }
  });
});
