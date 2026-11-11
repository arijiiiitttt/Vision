// Draws the REAL robot's brain with the simulator's own brain code (../autonomous/js, served at ./lib).
// The server runs the emotional brain; this page asks for its state once a second and mirrors it into a local copy, so the picture,
// hormones, instinct and predictive-loop panel are exactly what the simulator shows.
import { Limbic } from "./lib/limbic.js";
import { BrainRenderer } from "./lib/brainview.js";
import { BrainPanel } from "./lib/brainpanel.js";
import { buildCloud, buildFibres } from "./lib/brainsim/geometry.js";

const $ = (id) => document.getElementById(id);
const status = $("blStatus");
const limbic = new Limbic();
const sim = limbic.sim;
const density = Math.max(0.3, Math.min(1.5, Number(new URLSearchParams(location.search).get("density")) || 1.25));
const cloud = buildCloud(sim.nodes, density);
const fibres = buildFibres(cloud, sim.nodes, Math.round(340 * Math.min(1, density)));
const renderer = new BrainRenderer(sim, cloud, fibres, { left: $("brainCanvas") });
renderer.showLabels = true;
const panel = new BrainPanel(limbic, renderer);

let target = null;                       // newest state from the server
let epistemic = 0;
sim.generative.epistemicValue = () => epistemic;   // this number comes from the robot's own brain

function apply(b) {
  target = b;
  sim.asleep = b.asleep;
  Object.assign(sim.emotion, b.emotion);
  Object.assign(sim.decision, { current: b.decision.current, confidence: b.decision.confidence, conflict: b.decision.conflict });
  sim.generative.uncertainty = b.generative.uncertainty;
  sim.generative.lastPE = b.generative.lastPE;
  epistemic = b.generative.epistemic;
  sim.strongestEdges = b.edges;
  Object.defineProperty(sim, "activeStimulusLabel", { get: () => (b.hasStimulus ? "live" : null), configurable: true });
}

async function poll() {
  try {
    const res = await fetch("/api/system/mind/live", { credentials: "include", cache: "no-store" });
    if (res.status === 401) { status.className = "bl-status"; status.textContent = "Log in on the Vision dashboard to see the brain."; return; }
    const d = await res.json();
    const b = d?.mind?.brain;
    if (!b) { status.className = "bl-status"; status.textContent = d?.engine === "classic" ? "The classic brain is selected, so there is no brain picture." : "Waiting for the robot's brain to wake up…"; return; }
    status.className = "bl-status ok"; status.textContent = "";
    apply(b);
  } catch { status.className = "bl-status"; status.textContent = "Can't reach the Vision server."; }
}
poll(); setInterval(poll, 1000);

let last = performance.now(), panelT = 0, drawT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (target) {
    const k = 1 - Math.exp(-dt * 6);              // glide towards the newest numbers so it moves smoothly between updates
    for (let i = 0; i < sim.activity.length; i++) sim.activity[i] += (target.activity[i] - sim.activity[i]) * k;
    for (const id of Object.keys(target.nm)) sim.nm[id] += (target.nm[id] - sim.nm[id]) * k;
  }
  sim.time += dt;
  drawT += dt * 1000;
  if (!document.hidden && drawT >= (renderer.slow ? 66 : 33)) { renderer.draw(Math.min(0.12, drawT / 1000), sim.time); drawT = 0; }
  panelT += dt; if (panelT > 0.12) { panelT = 0; panel.update(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
