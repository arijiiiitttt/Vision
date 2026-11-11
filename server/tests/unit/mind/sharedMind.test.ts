import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SharedMind, type MindStore } from "../../../src/mind/SharedMind";
import { mindStorage } from "../../../src/mind/loadBrain";

// This test runs the REAL simulator brain files (server/simulation/autonomous/js) inside the server, with a pretend robot.
function setup(opts: { blocked?: () => boolean } = {}) {
  const sent: { type: string; params: any }[] = []; const saved: Record<string, string>[] = [];
  const store: MindStore = { load: async () => null, save: async (d) => { saved.push(d); } };
  const mind = new SharedMind({
    dispatch: async (_id, type, params) => { sent.push({ type, params }); return { success: true }; },
    isBlocked: async () => opts.blocked?.() ?? false,
    knownNames: async () => ["Asha"],
    store,
  });
  return { mind, sent, saved };
}

describe("shared mind: the simulator's brain running for the real robot", () => {
  beforeEach(() => { vi.useFakeTimers(); mindStorage.map.clear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("wakes up, speaks through the normal speak command, and keeps deciding things to do", async () => {
    const { mind, sent } = setup();
    await mind.start("robot-1");
    await vi.advanceTimersByTimeAsync(300);
    expect(sent[0]).toEqual({ type: "AUDIO_SPEAK", params: { text: expect.stringContaining("woke up") } });
    await vi.advanceTimersByTimeAsync(120_000);
    const kinds = new Set(sent.map((s) => s.type));
    expect([...kinds].some((k) => ["WALK_FORWARD", "TURN_LEFT", "TURN_RIGHT", "EYE_SET", "EYE_LEFT", "EYE_RIGHT", "DANCE"].includes(k))).toBe(true);
    const allowed = new Set(["AUDIO_SPEAK", "EYE_SET", "EYE_LEFT", "EYE_RIGHT", "EYE_CENTER", "TURN_LEFT", "TURN_RIGHT", "WALK_FORWARD", "WALK_STOP", "DANCE"]);
    expect(sent.filter((s) => !allowed.has(s.type))).toEqual([]);       // only commands the server's own pipeline knows
    await mind.stop();
  });

  it("reacts to a person the server's face recognition confirmed, by name", async () => {
    const { mind, sent } = setup();
    await mind.start("robot-1"); await vi.advanceTimersByTimeAsync(300); sent.length = 0;
    mind.observe({ personDetected: true, personName: "Asha", personCenterX: 320, frameWidth: 640, objects: [], motion: 0.3, brightness: 0.6, ultrasonicMm: 900 });
    await vi.advanceTimersByTimeAsync(8000);
    expect(sent.some((s) => s.type === "AUDIO_SPEAK" && /Asha/.test(s.params.text))).toBe(true);
    expect(mind.snapshot()).toMatchObject({ robotId: "robot-1" });
    await mind.stop();
  });

  it("gives the dashboard a live view: mood, all ten hormones, drives, what it sees and what happened", async () => {
    const { mind } = setup();
    expect(mind.live()).toBeNull();
    await mind.start("robot-1"); await vi.advanceTimersByTimeAsync(2000);
    mind.observe({ personDetected: true, personName: "Asha", personCenterX: 320, frameWidth: 640, objects: [], motion: 0.3, brightness: 0.6, ultrasonicMm: 900 });
    await vi.advanceTimersByTimeAsync(3000);
    const l = mind.live()!;
    expect(l.hormones.map((h: any) => h.id)).toEqual(expect.arrayContaining(["dopamine", "serotonin", "cortisol", "oxytocin", "melatonin"]));
    expect(l.hormones).toHaveLength(10);
    expect(l.hormones.every((h: any) => h.level >= 0 && h.level <= 1)).toBe(true);
    expect(l.seen).toContain("Asha");
    expect(l.events.length).toBeGreaterThan(0);
    expect(l.drives).toHaveProperty("curiosity");
    await mind.stop();
  });

  it("stays quiet while blocked (emergency stop, manual mode, robot offline)", async () => {
    let blocked = true; const { mind, sent } = setup({ blocked: () => blocked });
    await mind.start("robot-1"); await vi.advanceTimersByTimeAsync(60_000);
    expect(sent.filter((s) => s.type !== "WALK_STOP")).toEqual([]);
    blocked = false; await vi.advanceTimersByTimeAsync(120_000);
    expect(sent.length).toBeGreaterThan(0);
    await mind.stop();
  });

  it("saves its memory and stops the legs when switched off", async () => {
    const { mind, sent, saved } = setup();
    await mind.start("robot-1"); await vi.advanceTimersByTimeAsync(40_000);
    await mind.stop();
    expect(sent[sent.length - 1].type).toBe("WALK_STOP");
    expect(saved.length).toBeGreaterThan(0); expect(Object.keys(saved[saved.length - 1]).every((k) => k.startsWith("vision.robot."))).toBe(true);
    expect(mind.running).toBe(false);
  });
});
