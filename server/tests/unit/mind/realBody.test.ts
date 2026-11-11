import { describe, it, expect } from "vitest";
import { RealBody, type Instr } from "../../../src/mind/RealBody";

function make(refuse: string[] = []) {
  const sent: { type: string; params: Record<string, unknown> }[] = [];
  let t = 0;
  const body = new RealBody(
    async (type, params) => { sent.push({ type, params }); return refuse.includes(type) ? { success: false, error: "blocked" } : { success: true }; },
    async () => {},
    { turnDegPerSec: 90, walkUnitsPerSec: 1 },
    () => t,
    async (ms) => { t += ms; },        // time only moves when the body "waits"
  );
  return { body, sent, types: () => sent.map((s) => s.type) };
}
const exec = (command: string, arg?: number | string): Instr => ({ op: "EXEC", command, arg });

describe("RealBody (the simulator's brain driving the real robot)", () => {
  it("turns toward a heading using the real turn commands, and remembers which way it faces", async () => {
    const { body, sent } = make();
    await body.act([exec("FACE", 90)]);
    expect(sent[0]).toEqual({ type: "TURN_RIGHT", params: { durationMs: 1000 } });
    expect(body.getPose().headingDeg).toBe(90);
    await body.act([exec("FACE", 0)]);
    expect(sent[1]).toEqual({ type: "TURN_LEFT", params: { durationMs: 1000 } });
  });
  it("a quarter turn is 90 degrees", async () => {
    const { body, sent } = make(); await body.act([exec("TURN_LEFT", 500)]);
    expect(sent[0]).toEqual({ type: "TURN_LEFT", params: { durationMs: 1000 } }); expect(body.getPose().headingDeg).toBe(-90);
  });
  it("walking moves the estimated position along the heading and always ends with a stop", async () => {
    const { body, types } = make();
    await body.act([exec("WALK_FORWARD"), { op: "SLEEP", ms: 2000 }]);    // the plan forgets the stop
    expect(types()).toEqual(["WALK_FORWARD", "WALK_STOP"]);
    expect(body.getPose().z).toBeCloseTo(2, 1); expect(body.isWalking()).toBe(false);
  });
  it("GOTO turns, walks in legs, stops, and ends near the target", async () => {
    const { body, types } = make();
    await body.act([exec("GOTO", "3,4,1")]);                              // 5 away, stop 1 short
    const p = body.getPose(); expect(Math.hypot(3 - p.x, 4 - p.z)).toBeLessThan(1.4);
    expect(types()).toContain("TURN_RIGHT"); expect(types().filter((x) => x === "WALK_STOP").length).toBeGreaterThan(0);
  });
  it("gives up when the robot refuses to walk (obstacle or emergency stop)", async () => {
    const { body, types } = make(["WALK_FORWARD"]);
    await body.act([exec("GOTO", "0,10,0"), exec("DANCE")]);
    expect(types()).not.toContain("DANCE");                                // the rest of the plan was dropped
  });
  it("interrupt() cancels the rest of a plan and stops the legs", async () => {
    const { body, types } = make(); const plan = body.act([exec("WALK_FORWARD"), { op: "SLEEP", ms: 100000 }, exec("DANCE")]);
    await Promise.resolve(); await body.interrupt(); await plan;
    expect(types()).not.toContain("DANCE"); expect(types()).toContain("WALK_STOP");
  });
  it("unknown commands are ignored, eye commands are passed on", async () => {
    const { body, sent } = make(); await body.act([exec("NOPE"), exec("EYE_SET", 300), exec("EYE_LEFT", 25)]);
    expect(sent).toEqual([{ type: "EYE_SET", params: { angle: 180 } }, { type: "EYE_LEFT", params: { step: 25 } }]);
  });
});
