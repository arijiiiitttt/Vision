import { logger } from "../logging/Logger";

/** One step the brain asks the body to do. Same shape the simulator uses. */
export type Instr = { op: "EXEC"; command: string; arg?: number | string } | { op: "SLEEP"; ms: number };
export type Dispatch = (type: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

export interface BodyCalibration {
  /** How fast the real robot turns. Measure it once and set MIND_TURN_DEG_PER_SEC. */
  turnDegPerSec: number;
  /** How far it walks per second, in the mind's own distance unit (about one body length). Set MIND_WALK_UNITS_PER_SEC. */
  walkUnitsPerSec: number;
}
export const defaultCalibration = (): BodyCalibration => ({
  turnDegPerSec: Number(process.env.MIND_TURN_DEG_PER_SEC) || 90,
  walkUnitsPerSec: Number(process.env.MIND_WALK_UNITS_PER_SEC) || 0.6,
});

const norm = (d: number) => { let x = ((d + 180) % 360 + 360) % 360 - 180; return x === -180 ? 180 : x; };

/**
 * The real robot as the shared brain sees it ("the body"). Everything the brain wants goes out through the server's normal
 * command path (safety checks, ultrasonic stop, admin vetoes and the emergency stop all still apply), as the AI source.
 * The robot has no wheel counters, so where it is and which way it faces are estimated from what it was told to do
 * (dead reckoning). That is good enough for "turn toward", "walk about this far" and "go back home", and drifts over time.
 */
export class RealBody {
  pose = { x: 0, z: 0, unit: 1, headingDeg: 0 };
  private token = 0;
  private busy = 0;
  private walkingSince: number | null = null;

  constructor(
    private dispatch: Dispatch,
    private speak: (text: string) => Promise<void> | void,
    private cal: BodyCalibration = defaultCalibration(),
    private clock: () => number = () => Date.now(),
    private sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  isBusy = () => this.busy > 0;
  getPose = () => ({ ...this.pose });
  getWorld = () => [] as unknown[];
  isWalking = () => this.walkingSince !== null;

  /** Stop everything now (emergency stop, new command from a person, switching engines). */
  async interrupt() {
    this.token++;
    this.endWalk();
    await this.send("WALK_STOP", {});
  }

  async act(instructions: Instr[], say?: string) {
    if (say) { try { await this.speak(say); } catch (err) { logger.warn("Mind could not speak", { error: String(err) }); } }
    if (!instructions?.length) return;
    const mine = this.token;
    this.busy++;
    try {
      for (const i of instructions) {
        if (mine !== this.token) break;
        if (i.op === "SLEEP") { await this.nap(i.ms, mine); continue; }
        if (!(await this.exec(i.command, i.arg, mine))) break;
      }
    } finally {
      this.busy--;
      if (mine !== this.token) return;
      if (this.walkingSince !== null && this.busy === 0) { this.endWalk(); await this.send("WALK_STOP", {}); } // never leave it walking when the plan ends
    }
  }

  // ---------------------------------------------------------------- internals
  private async send(type: string, params: Record<string, unknown>) {
    try { return await this.dispatch(type, params); } catch (err) { logger.warn("Mind command failed", { type, error: String(err) }); return { success: false, error: String(err) }; }
  }
  private async nap(ms: number, token: number) {
    for (let left = Math.max(0, ms); left > 0 && token === this.token; left -= 200) await this.sleepFn(Math.min(200, left));
  }
  private beginWalk() { if (this.walkingSince === null) this.walkingSince = this.clock(); }
  private endWalk() {
    if (this.walkingSince === null) return;
    const dist = ((this.clock() - this.walkingSince) / 1000) * this.cal.walkUnitsPerSec; this.walkingSince = null;
    const h = (this.pose.headingDeg * Math.PI) / 180;
    this.pose.x += Math.sin(h) * dist; this.pose.z += Math.cos(h) * dist;
  }
  private async turnTo(target: number, token: number) {
    const delta = norm(target - this.pose.headingDeg);
    if (Math.abs(delta) < 3) return true;
    const ms = Math.round((Math.abs(delta) / this.cal.turnDegPerSec) * 1000);
    const r = await this.send(delta > 0 ? "TURN_RIGHT" : "TURN_LEFT", { durationMs: ms });
    if (!r.success) return false;
    this.pose.headingDeg = norm(target);
    await this.nap(ms, token);
    return token === this.token;
  }

  private async exec(command: string, arg: number | string | undefined, token: number): Promise<boolean> {
    switch (command) {
      case "EYE_CENTER": return (await this.send("EYE_CENTER", {})).success || true;
      case "EYE_SET": return (await this.send("EYE_SET", { angle: Math.max(0, Math.min(180, Number(arg))) })).success || true;
      case "EYE_LEFT": case "EYE_RIGHT": return (await this.send(command, { step: Math.max(1, Math.min(90, Number(arg ?? 15))) })).success || true;
      case "TURN_LEFT": case "TURN_RIGHT": {            // the mind means a quarter turn
        const sign = command === "TURN_LEFT" ? -1 : 1;
        return this.turnTo(this.pose.headingDeg + sign * 90, token);
      }
      case "FACE": return this.turnTo(Number(arg), token);
      case "WALK_FORWARD": { const r = await this.send("WALK_FORWARD", {}); if (r.success) this.beginWalk(); return r.success; }
      case "WALK_STOP": { this.endWalk(); await this.send("WALK_STOP", {}); return true; }
      case "DANCE": { await this.send("DANCE", {}); return true; }
      case "GOTO": return this.goTo(String(arg), token);
      default: return true;                              // unknown commands are ignored, like in the simulator
    }
  }

  /** Go to a spot in steps: turn toward it, walk a short leg, re-check. Gives up if the robot is told "no" (obstacle, stop). */
  private async goTo(arg: string, token: number): Promise<boolean> {
    const [x, z, stop = 0] = arg.split(",").map(Number);
    if (![x, z].every(Number.isFinite)) return true;
    for (let leg = 0; leg < 40 && token === this.token; leg++) {
      const dx = x - this.pose.x, dz = z - this.pose.z, dist = Math.hypot(dx, dz) - (Number.isFinite(stop) ? stop : 0);
      if (dist <= 0.3) return true;
      if (!(await this.turnTo((Math.atan2(dx, dz) * 180) / Math.PI, token))) return false;
      const step = Math.min(dist, 3), ms = Math.round((step / this.cal.walkUnitsPerSec) * 1000);
      const r = await this.send("WALK_FORWARD", {});
      if (!r.success) return false;                      // blocked or refused: stop trying
      this.beginWalk(); await this.nap(ms, token); this.endWalk(); await this.send("WALK_STOP", {});
    }
    return true;
  }
}
