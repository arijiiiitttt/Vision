import { apiClient, getStoredToken } from "./client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/** Origin that serves /simulation/ (the API server), derived from the API base URL. */
export const SIMULATION_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

/**
 * Simulator page URL, optionally deep-linked to a view ("compiler" | "autonomous" | "live").
 * The dashboard and the simulator can be different websites (Vercel vs the API server), so the login cookie may not reach the
 * simulator. The session token therefore rides along after "!t=" in the part of the address behind "#", which is never sent to a
 * server; the simulator page picks it up, stores it for its own tab and removes it from the address (server/simulation/js/auth.js).
 */
export const simulatorUrl = (view) => {
  const token = getStoredToken();
  const hash = `${view ? view : ""}${token ? `!t=${encodeURIComponent(token)}` : ""}`;
  return `${SIMULATION_ORIGIN}/simulation/${hash ? `#${hash}` : ""}`;
};

/** The live brain picture of the real robot (served by the API server in every robot mode; it carries the same login hand-over as the simulator link). */
export const brainViewUrl = () => {
  const token = getStoredToken();
  return `${SIMULATION_ORIGIN}/brain-view/${token ? `#!t=${encodeURIComponent(token)}` : ""}`;
};

/**
 * Simulation-only endpoints. They answer 409 NOT_SIMULATION when the server runs with
 * ROBOT_MODE=hardware, so nothing here can ever reach the real robot.
 */
export const simulationApi = {
  getMode: () => apiClient.get("/simulation/mode"),
  setMode: (mode) => apiClient.post("/simulation/mode", { mode }),
  /** Send a script to the simulator's Compiler view (the server compiles it; ADMIN only). */
  pushProgram: (source, sourceName, autoplay = false) => apiClient.post("/simulation/program", { source, sourceName, autoplay }),
};
