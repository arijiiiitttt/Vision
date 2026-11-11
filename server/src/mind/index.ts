import { eq } from "drizzle-orm";
import { db } from "../database/client";
import { systemSettings } from "../database/schema";
import { commandRegistry } from "../commands/CommandRegistry";
import { controlMode } from "../control/ControlMode";
import { safetyManager } from "../safety/SafetyManager";
import { getRobotLinkStatus } from "../robot/linkStatus";
import { peopleRepository } from "../repositories/people.repository";
import { SharedMind, mindEngine, type MindStore } from "./SharedMind";

export { mindEngine, SharedMind };
export type { MindObservation } from "./SharedMind";

/** The mind's memory lives in one row of system_settings, so it survives restarts and redeploys (unlike a local file on Render). */
const dbStore: MindStore = {
  async load() {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, "shared_mind"));
    return (row?.value as Record<string, string> | undefined) ?? null;
  },
  async save(data) {
    await db.insert(systemSettings).values({ key: "shared_mind", value: data }).onConflictDoUpdate({ target: systemSettings.key, set: { value: data, updatedAt: new Date() } });
  },
};

export const sharedMind = new SharedMind({
  // Source "AI", not an admin: every safety check, ultrasonic stop and admin veto applies to the mind like to any other brain.
  dispatch: (robotId, type, params) => commandRegistry.dispatch({ type: type as never, params, source: "AI", robotId, isAdmin: false }) as Promise<{ success: boolean; error?: string }>,
  // The mind stays quiet during an emergency stop, while a person drives in manual mode, and while the robot is not connected
  // (so nothing piles up in the command queue and then replays when the robot comes back).
  isBlocked: async () => safetyManager.isEmergencyActive() || !getRobotLinkStatus().connected || (await controlMode.isManualModeEnabled()),
  knownNames: async () => (await peopleRepository.list()).map((p: { name: string | null }) => p.name).filter((n): n is string => !!n),
  store: dbStore,
});

/** True when the shared brain is the one in charge (the dashboard can switch back to the classic one). */
export const sharedMindActive = () => mindEngine.get() === "shared";
