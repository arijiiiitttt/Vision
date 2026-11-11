import fs from "node:fs";
import path from "node:path";
import { logger } from "../logging/Logger";
import { loadBrainModules, mindStorage } from "./loadBrain";
import { RealBody, type Dispatch, type Instr } from "./RealBody";

export type MindEngine = "shared" | "classic";
export const isMindEngine = (v: unknown): v is MindEngine => v === "shared" || v === "classic";

/** What the camera and sensors reported this moment (filled in by BrainOrchestrator from its normal perception result). */
export interface MindObservation {
  personDetected: boolean;
  personName: string | null;          // a person the server's face recognition confirmed
  personCenterX?: number;             // pixels
  frameWidth: number;
  objects: { name: string; confidence: number; centerX?: number }[];
  motion: number;                     // 0..1
  brightness: number;                 // 0..1
  ultrasonicMm: number;
}

/** Where the mind's memory is kept so it survives a restart. */
export interface MindStore {
  load(): Promise<Record<string, string> | null>;
  save(data: Record<string, string>): Promise<void>;
}

/** Which brain is in charge: "shared" (the simulator's brain, running on the server) or "classic" (the older built-in one). */
class MindEngineService {
  private get file() { return process.env.MIND_ENGINE_FILE ?? path.join(process.cwd(), "data", "mind-engine.json"); }
  // Default: the shared brain (the simulator's). Automated tests of the classic pipeline start on "classic" so they stay about that pipeline.
  private current: MindEngine = isMindEngine(process.env.MIND_ENGINE) ? (process.env.MIND_ENGINE as MindEngine) : process.env.VITEST ? "classic" : "shared";
  load(): MindEngine {
    try { const s = JSON.parse(fs.readFileSync(this.file, "utf8")) as { engine?: unknown }; if (isMindEngine(s.engine)) this.current = s.engine; } catch { /* nothing saved */ }
    return this.current;
  }
  get(): MindEngine { return this.current; }
  set(engine: MindEngine) {
    this.current = engine;
    try { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify({ engine, savedAt: new Date().toISOString() })); }
    catch (err) { logger.warn("Could not remember the brain choice", { error: String(err) }); }
  }
}
export const mindEngine = new MindEngineService();

export interface SharedMindDeps {
  dispatch: (robotId: string, type: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  /** True when the brain must stay quiet right now (emergency stop, or a person is driving in manual mode). */
  isBlocked: () => Promise<boolean>;
  knownNames: () => Promise<string[]>;
  store: MindStore;
  now?: () => number;
}

const KEY_PREFIX = "vision.robot.";   // only the brain's own notes are saved
const NEAR_MM = 1200;
const GONE_AFTER_FRAMES = 3;

/**
 * Runs the simulator's brain (same files) for the real robot. The server's camera pipeline stays the robot's EYES and
 * SAFETY (who is there, what is there, how far); this class feeds that into the brain and carries out what the brain decides
 * through the normal command path.
 */
export class SharedMind {
  private brain: any = null;
  private limbic: any = null;
  private body: RealBody | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private senses = { motion: 0, brightness: 0.5, loudness: 0, camera: true, mic: false };
  private names: string[] = [];
  private present = new Map<string, { missed: number; label: string }>();
  private robotId = "";
  private starting: Promise<void> | null = null;
  private wasBlocked = false;
  private chems: any[] = [];
  private events: { at: number; type: string; text: string }[] = [];

  constructor(private deps: SharedMindDeps) {}

  get running() { return !!this.brain; }
  get busy() { return this.body?.isBusy() ?? false; }

  async start(robotId: string) {
    if (this.brain) return;
    if (this.starting) return this.starting;
    this.starting = this.boot(robotId).finally(() => { this.starting = null; });
    return this.starting;
  }

  private async boot(robotId: string) {
    const { Brain, Limbic, CHEMS } = await loadBrainModules();
    this.chems = CHEMS ?? [];
    this.robotId = robotId;
    const saved = await this.deps.store.load().catch(() => null);
    if (saved) for (const [k, v] of Object.entries(saved)) if (k.startsWith(KEY_PREFIX)) mindStorage.setItem(k, v);
    this.names = await this.deps.knownNames().catch(() => []);
    const dispatch: Dispatch = (type, params) => this.deps.dispatch(robotId, type, params);
    this.body = new RealBody(dispatch, async (text) => { await dispatch("AUDIO_SPEAK", { text }); }, undefined, this.deps.now);
    this.limbic = new Limbic();
    const body = this.body;
    this.brain = new Brain(
      {
        act: async (ins: Instr[], say?: string) => { if (await this.deps.isBlocked()) return; return body.act(ins, say); },
        isBusy: () => body.isBusy(),
        getPose: () => body.getPose(),
        getWorld: () => body.getWorld(),
      },
      {
        now: this.deps.now,
        human: true,
        weather: false,
        smartExplore: true,
        storageKey: `${KEY_PREFIX}${robotId}`,
        onEvent: (type: string, text: string) => { this.events.push({ at: Date.now(), type, text }); if (this.events.length > 60) this.events.shift(); },
        onFeel: (kind: string, detail?: string) => this.limbic?.feel(kind, detail),
        getChem: () => this.limbic?.state(),
        getSenses: () => this.senses,
        knownNames: () => this.names,
      },
    );
    this.brain.start();
    this.timers.push(setInterval(() => this.heartbeat(), 500));
    this.timers.push(setInterval(() => { void this.persist(); }, 30_000));
    this.timers.push(setInterval(() => { void this.deps.knownNames().then((n) => { this.names = n; }).catch(() => {}); }, 60_000));
    logger.info("Shared mind started", { robotId });
  }

  async stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.brain?.stop?.();
    await this.body?.interrupt();
    await this.persist();
    this.brain = null; this.limbic = null; this.body = null; this.present.clear();
  }

  /** Stop moving right now (emergency stop). The brain stays alive. */
  async halt() { await this.body?.interrupt(); }

  private async heartbeat() {
    try { this.limbic?.step(0.5); } catch { /* keep going */ }
    const blocked = await this.deps.isBlocked().catch(() => false);
    if (blocked && !this.wasBlocked) await this.body?.interrupt();     // stop at once, once, when something takes over
    this.wasBlocked = blocked;
  }

  /** One camera/sensor update from the server's perception. Turns it into "appeared" / "left" sightings the brain understands. */
  observe(o: MindObservation) {
    if (!this.brain) return;
    this.senses = { ...this.senses, motion: clamp01(o.motion), brightness: clamp01(o.brightness) };
    const near = o.ultrasonicMm > 0 && o.ultrasonicMm <= NEAR_MM;
    const side = (cx?: number): "left" | "center" | "right" => cx === undefined || !o.frameWidth ? "center" : cx / o.frameWidth < 0.38 ? "left" : cx / o.frameWidth > 0.62 ? "right" : "center";
    const now = new Map<string, { label: string; side: "left" | "center" | "right" }>();
    if (o.personDetected) { const label = o.personName ?? "person"; now.set(label.toLowerCase(), { label, side: side(o.personCenterX) }); }
    for (const ob of o.objects) if (ob.confidence >= 0.5 && ob.name !== "person") now.set(ob.name.toLowerCase(), { label: ob.name, side: side(ob.centerX) });
    for (const [key, v] of now) {
      const had = this.present.get(key);
      this.present.set(key, { missed: 0, label: v.label });
      if (!had) this.brain.sight({ type: "appeared", label: v.label, side: v.side, near, source: "camera" });
    }
    for (const [key, v] of [...this.present]) {
      if (now.has(key)) continue;
      v.missed++;
      if (v.missed >= GONE_AFTER_FRAMES) { this.present.delete(key); this.brain.sight({ type: "left", label: v.label, side: "center", near: false, source: "camera" }); }
    }
  }

  /** Something a person said to the robot. The brain answers (and may move); returns what it said. */
  async hear(text: string): Promise<string | null> {
    if (!this.brain) return null;
    this.brain.notice?.();
    const r = this.brain.hear(text);
    if (!r) return null;
    if (!(await this.deps.isBlocked())) await this.body?.act(r.instructions ?? [], r.reply);
    return r.reply ?? null;
  }

  /** The person was taught a name (for example on the People page): the brain should know it. */
  learnName(name: string) { if (!this.names.includes(name)) this.names.push(name); this.brain?.learnPersonName?.(name); }

  snapshot() {
    if (!this.brain) return null;
    const s = this.brain.snapshot();
    return { ...s, pose: this.body?.getPose(), busy: this.body?.isBusy() ?? false, robotId: this.robotId };
  }

  /** Everything the dashboard's live page shows: mood, hormones, drives, what it is thinking, what it sees and what just happened. */
  live() {
    if (!this.brain) return null;
    const snap = this.brain.snapshot();
    const lim = this.limbic?.state?.();
    const nm = (lim?.nm ?? {}) as Record<string, number>;
    return {
      robotId: this.robotId,
      mood: snap.mood, thought: snap.thought, lastAction: snap.lastAction, busy: this.body?.isBusy() ?? false,
      pose: this.body?.getPose(),
      drives: { valence: snap.valence, arousal: snap.arousal, curiosity: snap.curiosity, social: snap.social, boredom: snap.boredom, sleepiness: snap.sleepiness ?? 0 },
      emotion: lim ? { name: lim.emotion, intensity: lim.intensity, because: lim.because, instinct: lim.instinct, instinctConfidence: lim.instinctConfidence, asleep: lim.asleep, moodValence: lim.moodValence, moodArousal: lim.moodArousal } : null,
      hormones: this.chems.map((c: any) => ({ id: c.id, label: c.label, color: c.color, base: c.base, role: c.role, level: nm[c.id] ?? c.base })),
      person: snap.person ?? null, plan: snap.plan ?? null, clock: snap.clock ?? null, phase: snap.phase ?? null, interactions: snap.interactions, userName: snap.userName ?? null,
      senses: { ...this.senses }, seen: [...this.present.values()].map((v) => v.label),
      events: this.events.slice(-30).reverse(),
      brain: this.brainState(),
    };
  }

  /** The inner state of the emotional brain (region activity, hormones, instinct, prediction error) so the dashboard can draw the same brain picture the simulator draws. */
  private brainState() {
    const sim = this.limbic?.sim;
    if (!sim) return null;
    const r = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
    return {
      time: sim.time, asleep: !!sim.asleep,
      nm: Object.fromEntries(Object.entries(sim.nm as Record<string, number>).map(([k, v]) => [k, r(v)])),
      activity: Array.from(sim.activity as Float32Array, (v) => r(v)),
      emotion: { current: sim.emotion.current, intensity: r(sim.emotion.intensity), because: sim.emotion.because ?? "", moodValence: r(sim.emotion.moodValence ?? 0), moodArousal: r(sim.emotion.moodArousal ?? 0.3) },
      decision: { current: sim.decision.current, confidence: r(sim.decision.confidence), conflict: r(sim.decision.conflict) },
      generative: { uncertainty: r(sim.generative.uncertainty), lastPE: r(sim.generative.lastPE), epistemic: r(sim.generative.epistemicValue(sim.decision.current)) },
      hasStimulus: sim.activeStimulusLabel != null,
      edges: (sim.strongestEdges ?? []).slice(0, 12).map((e: any) => ({ from: e.from, to: e.to, strength: r(e.strength, 3) })),
    };
  }

  async persist() {
    try {
      const out: Record<string, string> = {};
      for (const [k, v] of mindStorage.map) if (k.startsWith(KEY_PREFIX)) out[k] = v;
      await this.deps.store.save(out);
    } catch (err) { logger.warn("Could not save the mind", { error: String(err) }); }
  }
}
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
