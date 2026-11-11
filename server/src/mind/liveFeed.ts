/** The newest thing the real robot's camera and sensors reported, kept in memory for the dashboard's live page. */
export interface LiveFeed {
  robotId: string;
  at: number;                        // ms since epoch
  jpeg: Buffer | null;
  frameWidth: number;
  frameHeight: number;
  personDetected: boolean;
  personName: string | null;
  objects: { name: string; confidence: number; box?: { x: number; y: number; width: number; height: number } }[];
  motion: number;                    // 0..1
  brightness: number;                // 0..1
  ultrasonicMm: number;
}

const feeds = new Map<string, LiveFeed>();
export function setLiveFeed(f: LiveFeed) { feeds.set(f.robotId, f); }
/** Newest feed for this robot, or the most recent one from any robot when no id is given. */
export function getLiveFeed(robotId?: string): LiveFeed | null {
  if (robotId) return feeds.get(robotId) ?? null;
  let best: LiveFeed | null = null;
  for (const f of feeds.values()) if (!best || f.at > best.at) best = f;
  return best;
}
export function clearLiveFeeds() { feeds.clear(); }
