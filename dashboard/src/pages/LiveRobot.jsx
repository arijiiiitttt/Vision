import { useEffect, useRef, useState } from "react";
import { Brain, Camera, Activity, Compass, ListTree, User, Ruler, Waves, Sun, Sparkles, Eye, MessageCircle, Footprints, Heart, Lightbulb, Ear } from "lucide-react";
import { robotsApi } from "../api/robots";
import { getStoredToken } from "../api/client";
import { brainViewUrl } from "../api/simulation";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const INK = "#1F1E1C";
const SOFT = "#6B6A66";
const LINE = "#ECE9E1";
const HISTORY = 48;

const clamp01 = (v) => Math.max(0, Math.min(1, v ?? 0));
const pct = (v) => `${Math.round(clamp01(v) * 100)}%`;
const hexA = (hex, a) => { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

const EVENT_STYLE = {
  see: { c: "#2563EB", icon: Eye }, say: { c: "#16A34A", icon: MessageCircle }, hear: { c: "#0891B2", icon: Ear },
  act: { c: "#7C5CFF", icon: Footprints }, feel: { c: "#DB2777", icon: Heart }, think: { c: "#CA8A04", icon: Lightbulb }, plan: { c: "#CA8A04", icon: Lightbulb },
};

/* ---------- small building blocks ---------- */
function Panel({ icon: Icon, title, hint, right, children, className = "", flush = false }) {
  return (
    <section className={`rounded-3xl bg-white border ${className}`} style={{ borderColor: LINE, boxShadow: "0 1px 2px rgba(20,20,20,.04), 0 12px 32px -16px rgba(40,30,90,.12)" }}>
      <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h3 className="flex items-center gap-2.5 text-[15px] font-semibold" style={{ color: INK }}>
            {Icon && <span className="grid place-items-center w-8 h-8 rounded-xl" style={{ background: "linear-gradient(135deg,#F4F0FF,#EAF3FF)", color: "#5B3FD1" }}><Icon size={16} /></span>}
            {title}
          </h3>
          {hint && <p className="text-[13px] mt-1.5" style={{ color: SOFT }}>{hint}</p>}
        </div>
        {right}
      </header>
      <div className={flush ? "" : "px-6 pb-6"}>{children}</div>
    </section>
  );
}

function Ring({ value, color, label, size = 84, text }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r, v = clamp01(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1EEE7" strokeWidth="9" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`} style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 2px 4px ${hexA(color, 0.35)})` }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums" style={{ color: INK }}>{text ?? Math.round(v * 100)}</span>
      </div>
      <span className="text-[12px]" style={{ color: SOFT }}>{label}</span>
    </div>
  );
}

function Spark({ data, color, base }) {
  const W = 140, H = 36;
  if (!data || data.length < 2) return <div style={{ height: H }} />;
  const pts = data.map((v, i) => [(i / (HISTORY - 1)) * W + (W - (data.length - 1) / (HISTORY - 1) * W), H - 3 - clamp01(v) * (H - 6)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const id = `sp${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <line x1="0" x2={W} y1={H - 3 - clamp01(base) * (H - 6)} y2={H - 3 - clamp01(base) * (H - 6)} stroke="rgba(0,0,0,.18)" strokeDasharray="3 3" strokeWidth="1" />
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

function Hormone({ h, history }) {
  const lvl = clamp01(h.level);
  const up = lvl - h.base;
  return (
    <div className="group rounded-2xl p-4 border transition-shadow hover:shadow-md" title={`${h.role}. The dashed line is its resting level.`}
      style={{ borderColor: LINE, background: `linear-gradient(180deg, ${hexA(h.color, 0.07)}, #fff 60%)` }}>
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium capitalize" style={{ color: INK }}>{h.label}</span>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums" style={{ color: up > 0.04 ? "#15803D" : up < -0.04 ? "#B45309" : SOFT, background: up > 0.04 ? "#E7F6EC" : up < -0.04 ? "#FFF1DC" : "#F4F2EC" }}>
          {up > 0.04 ? "▲ high" : up < -0.04 ? "▼ low" : "rest"}
        </span>
      </div>
      <div className="text-[30px] leading-none font-semibold tabular-nums mt-2" style={{ color: h.color }}>{Math.round(lvl * 100)}</div>
      <div className="mt-2"><Spark data={history} color={h.color} base={h.base} /></div>
      <p className="text-[11.5px] mt-2 leading-snug line-clamp-2" style={{ color: SOFT }}>{h.role}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, bar, color = "#7C5CFF" }) {
  return (
    <div className="rounded-2xl px-4 py-3 border bg-white/80 backdrop-blur" style={{ borderColor: LINE }}>
      <div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider" style={{ color: SOFT }}><Icon size={13} /> {label}</div>
      <div className="text-[22px] leading-tight font-semibold mt-1 truncate" style={{ color: INK }}>{value}</div>
      {bar != null ? <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "#F1EEE7" }}><div className="h-full rounded-full transition-all duration-700" style={{ width: pct(bar), background: color }} /></div>
        : sub ? <div className="text-[12px] mt-1 truncate" style={{ color: SOFT }}>{sub}</div> : null}
    </div>
  );
}

function Corners({ color = "rgba(255,255,255,.85)" }) {
  const s = { position: "absolute", width: 22, height: 22, borderColor: color, borderStyle: "solid", borderWidth: 0, borderRadius: 4 };
  return (<>
    <i style={{ ...s, top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3 }} /><i style={{ ...s, top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3 }} />
    <i style={{ ...s, bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3 }} /><i style={{ ...s, bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3 }} />
  </>);
}

/** What the real robot sees and how its brain feels and thinks, refreshed every second. */
export default function LiveRobot() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [img, setImg] = useState(null);
  const lastUrl = useRef(null);
  const hist = useRef({});

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await robotsApi.live();
        if (!alive) return;
        for (const h of d.mind?.hormones ?? []) { const a = (hist.current[h.id] ??= []); a.push(h.level); if (a.length > HISTORY) a.shift(); }
        setData(d); setFailed(false);
        if (d.camera?.hasFrame) {
          const token = getStoredToken();
          const res = await fetch(`${BASE_URL}/system/mind/frame?t=${d.camera.at}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (res.ok && alive) {
            const url = URL.createObjectURL(await res.blob());
            if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
            lastUrl.current = url; setImg(url);
          }
        }
      } catch { if (alive) setFailed(true); }
    };
    tick(); const t = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(t); if (lastUrl.current) URL.revokeObjectURL(lastUrl.current); };
  }, []);

  const cam = data?.camera; const m = data?.mind;
  const fresh = !!cam && cam.ageMs < 8000;
  const status = failed ? { t: "Can't reach the server", c: "#B42318", bg: "#FDECEA" }
    : fresh ? { t: "Live", c: "#1A7F37", bg: "#DDF5E6" }
    : cam ? { t: `Last picture ${Math.round(cam.ageMs / 1000)} s ago`, c: "#8A6100", bg: "#FFF4D6" }
    : { t: "Waiting for the robot's camera", c: "#6B6A66", bg: "#F1EFEA" };
  const top = m ? [...m.hormones].sort((a, b) => (b.level - b.base) - (a.level - a.base))[0] : null;
  const accent = top?.color ?? "#7C5CFF";
  const intensity = m?.emotion?.intensity ?? 0;
  const near = cam && cam.ultrasonicMm > 0 ? clamp01(1 - cam.ultrasonicMm / 2000) : null;

  return (
    <div className="space-y-6" style={{ color: INK }}>
      {/* Hero */}
      <div className="relative rounded-3xl border overflow-hidden" style={{ borderColor: LINE, boxShadow: "0 12px 36px -18px rgba(40,30,90,.25)" }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(900px 260px at 8% 0%, ${hexA(accent, 0.22)}, transparent 60%), radial-gradient(700px 240px at 100% 100%, rgba(80,140,255,.14), transparent 60%), linear-gradient(135deg,#FFFFFF,#F8F6FF)` }} />
        <div className="relative p-6 sm:p-7 flex flex-wrap items-center gap-x-10 gap-y-5">
          <div className="flex items-center gap-5 min-w-[300px]">
            <div className="relative w-[84px] h-[84px] shrink-0">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: hexA(accent, 0.18), animationDuration: "2.8s" }} />
              <svg width="84" height="84" className="absolute inset-0 -rotate-90">
                <circle cx="42" cy="42" r="37" fill="none" stroke={hexA(accent, 0.18)} strokeWidth="5" />
                <circle cx="42" cy="42" r="37" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 37 * clamp01(intensity)} 999`} style={{ transition: "stroke-dasharray .8s" }} />
              </svg>
              <div className="absolute inset-[9px] rounded-full grid place-items-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${accent}, ${hexA(accent, 0.7)})` }}><Brain size={30} /></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 h-6 rounded-full" style={{ color: status.c, background: status.bg }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${fresh && !failed ? "animate-pulse" : ""}`} style={{ background: status.c }} />{status.t}
                </span>
                {m?.emotion?.asleep && <span className="text-[12px] px-2.5 h-6 inline-flex items-center rounded-full bg-[#EEF0FF] text-[#4B4BB5]">asleep</span>}
              </div>
              <h2 className="text-[34px] leading-[1.1] font-semibold capitalize mt-2 tracking-tight">{m ? m.mood : "Waiting"}</h2>
              <p className="text-[13.5px] mt-1 max-w-[340px]" style={{ color: SOFT }}>
                {data?.engine === "classic" ? "The classic brain is selected, so mood and hormones are not shown."
                  : m?.emotion?.because ? `${m.emotion.name.toLowerCase()} ${pct(m.emotion.intensity)} · ${m.emotion.because}`
                  : m ? "Shared brain, the same as the simulator" : "The brain wakes when the camera sends a picture"}
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-[300px] grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={User} label="Person" value={cam ? (cam.personDetected ? (cam.personName ?? "Someone") : "No one") : "-"} sub={m?.person ? `with ${m.person}` : "nobody in view"} />
            <Stat icon={Ruler} label="Distance" value={cam && cam.ultrasonicMm > 0 ? `${Math.round(cam.ultrasonicMm / 10)} cm` : "-"} bar={near} color="#F59E0B" />
            <Stat icon={Waves} label="Motion" value={cam ? pct(cam.motion) : "-"} bar={cam ? cam.motion : null} color="#7C5CFF" />
            <Stat icon={Sun} label="Light" value={cam ? pct(cam.brightness) : "-"} bar={cam ? cam.brightness : null} color="#EAB308" />
          </div>
        </div>
      </div>

      {/* Camera + right now */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Panel icon={Camera} title="Camera" hint="Exactly what the robot's eye sees right now" className="xl:col-span-7"
          right={cam && <span className="text-[12px] tabular-nums px-2 py-1 rounded-lg bg-[#F4F2EC]" style={{ color: SOFT }}>{cam.width}×{cam.height}</span>}>
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden grid place-items-center" style={{ background: "radial-gradient(circle at 50% 40%, #2A2A33, #121216)" }}>
            {img
              ? <img src={img} alt="What the robot sees right now" className="w-full h-full object-contain" />
              : <p className="text-sm px-8 text-center" style={{ color: "#A9A7B3" }}>No picture yet. It appears here as soon as the ESP32 sends one.</p>}
            <Corners />
            {img && fresh && <span className="absolute top-5 left-14 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2.5 h-6 rounded-full bg-black/45 backdrop-blur"><span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] animate-pulse" />LIVE</span>}
            {img && cam?.objects?.filter((o) => o.box && o.box.width > 0).map((o, i) => (
              <div key={i} className="absolute rounded-lg pointer-events-none" style={{ border: "2px solid #B6A3FF", boxShadow: "0 0 0 1px rgba(124,92,255,.4), 0 0 18px rgba(124,92,255,.35)", left: pct(o.box.x / cam.width), top: pct(o.box.y / cam.height), width: pct(o.box.width / cam.width), height: pct(o.box.height / cam.height) }}>
                <span className="absolute -top-6 left-[-2px] text-[11px] font-medium text-white px-2 py-0.5 rounded-md bg-[#7C5CFF] whitespace-nowrap">{o.name} {Math.round(o.confidence * 100)}%</span>
              </div>
            ))}
            {img && cam && (
              <div className="absolute bottom-4 left-14 right-14 flex items-center justify-center gap-2 text-[12px] text-white">
                <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur">{cam.personDetected ? (cam.personName ?? "Someone") : "No one"}{cam.ultrasonicMm > 0 ? ` · ${Math.round(cam.ultrasonicMm / 10)} cm` : ""}</span>
              </div>
            )}
          </div>
          {cam?.objects?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">{cam.objects.map((o, i) => <span key={i} className="text-[12px] px-3 py-1 rounded-full" style={{ background: "#F1EDFF", color: "#5B3FD1" }}>{o.name} · {Math.round(o.confidence * 100)}%</span>)}</div>
          )}
        </Panel>

        <Panel icon={Sparkles} title="Right now" hint="What it is thinking and doing" className="xl:col-span-5">
          {m ? (
            <div className="space-y-5">
              <blockquote className="relative rounded-2xl px-5 py-4 text-[16px] leading-snug" style={{ background: `linear-gradient(135deg, ${hexA(accent, 0.13)}, #F7F4FF)` }}>
                <span className="absolute -top-3 left-4 text-4xl leading-none" style={{ color: accent }}>“</span>
                {m.thought || "…"}
              </blockquote>
              <dl className="grid grid-cols-[84px_1fr] gap-y-3 text-[14px]">
                <dt style={{ color: SOFT }}>Doing</dt><dd>{m.lastAction || "-"}{m.busy ? <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-[#DDF5E6] text-[#1A7F37]">moving now</span> : null}</dd>
                <dt style={{ color: SOFT }}>Plan</dt><dd>{m.plan || "-"}</dd>
                <dt style={{ color: SOFT }}>With</dt><dd>{m.person || "nobody"}</dd>
                <dt style={{ color: SOFT }}>In view</dt><dd>{m.seen?.length ? m.seen.join(", ") : "nothing"}</dd>
                {m.clock && (<><dt style={{ color: SOFT }}>Time</dt><dd>{m.clock}{m.phase ? ` · ${m.phase}` : ""}</dd></>)}
              </dl>
              <div className="pt-4 border-t" style={{ borderColor: LINE }}>
                <p className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider mb-3" style={{ color: SOFT }}><Compass size={13} /> Drives</p>
                <div className="grid grid-cols-3 gap-y-4">
                  <Ring label="Curiosity" value={m.drives.curiosity} color="#F59E0B" />
                  <Ring label="Wants company" value={m.drives.social} color="#EC4899" />
                  <Ring label="Boredom" value={m.drives.boredom} color="#64748B" />
                  <Ring label="Arousal" value={m.drives.arousal} color="#EF4444" />
                  <Ring label="Happiness" value={(m.drives.valence + 1) / 2} color="#16A34A" />
                  <Ring label="Sleepiness" value={m.drives.sleepiness} color="#6366F1" />
                </div>
              </div>
            </div>
          ) : <p className="text-sm" style={{ color: SOFT }}>Not awake yet.</p>}
        </Panel>
      </div>

      {/* Brain */}
      <Panel icon={Brain} title="Brain" hint="The same brain the simulator draws, fed live by the real robot. Drag the brain to turn it." flush>
        <div className="px-3 pb-3">
          <iframe title="The robot's brain, live" src={brainViewUrl()} className="w-full block h-[740px] max-h-[90vh] rounded-2xl border" style={{ borderColor: LINE, background: "#fff" }} />
        </div>
      </Panel>

      {/* Hormones */}
      <Panel icon={Activity} title="Hormones" hint="Each tile shows the level now and the last minute. The dashed line is where it rests.">
        {m ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">{m.hormones.map((h) => <Hormone key={h.id} h={h} history={hist.current[h.id]} />)}</div>
        ) : <p className="text-sm" style={{ color: SOFT }}>Appears when the brain is awake.</p>}
      </Panel>

      {/* Events */}
      <Panel icon={ListTree} title="What just happened" hint="Newest first">
        {m?.events?.length ? (
          <ul className="max-h-96 overflow-auto -mr-2 pr-2 relative">
            <span className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: LINE }} />
            {m.events.map((e, i) => {
              const st = EVENT_STYLE[e.type] ?? { c: "#9A988F", icon: Sparkles }; const Ico = st.icon;
              return (
                <li key={`${e.at}-${i}`} className="relative flex items-start gap-4 py-2.5">
                  <span className="relative z-10 grid place-items-center w-[31px] h-[31px] rounded-full shrink-0 bg-white border" style={{ borderColor: hexA(st.c, 0.4), color: st.c }}><Ico size={14} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: SOFT }}>
                      <span className="uppercase tracking-wider font-semibold" style={{ color: st.c }}>{e.type}</span>
                      <span className="tabular-nums">{new Date(e.at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[14.5px] mt-0.5">{e.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm" style={{ color: SOFT }}>Nothing yet.</p>}
      </Panel>
    </div>
  );
}
