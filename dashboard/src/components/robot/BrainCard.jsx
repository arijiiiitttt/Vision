import { useEffect, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { robotsApi } from "../../api/robots";
import { useAuthStore, hasRole } from "../../auth/authStore";

/** Which brain drives the robot. "Shared" = the very same brain the simulator uses, running on the server. Everyone signed in sees what it is thinking; only admins can switch. */
export default function BrainCard() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const { user } = useAuthStore();
  const isAdmin = hasRole(user, "ADMIN");

  useEffect(() => {
    let alive = true;
    const load = () => robotsApi.mind().then((d) => alive && setData(d)).catch(() => alive && setData(null));
    load(); const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  async function choose(engine) {
    if (busy || !data || data.engine === engine) return;
    setBusy(true); setProblem("");
    try { setData(await robotsApi.setMindEngine(engine).then((r) => ({ ...data, ...r, mind: engine === "classic" ? null : data.mind }))); }
    catch (e) { setProblem(e?.status === 403 ? "Only an admin can change the brain." : "Could not change the brain. Is the server running?"); }
    finally { setBusy(false); }
  }

  const shared = data?.engine === "shared";
  const m = data?.mind;
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-md font-semibold text-black flex items-center gap-2"><Brain size={16} /> Brain</h3>
          <p className="text-sm text-vision-muted mt-1">
            {!data ? "Can't reach the server."
              : shared ? "Shared brain: the same brain as the simulator decides what the robot does. The camera and sensors are its eyes; safety checks still apply to every move."
              : "Classic brain: the older built-in behaviour is in charge."}
          </p>
        </div>
        {isAdmin && data && (
          <div role="group" aria-label="Brain" className="inline-flex rounded-xl bg-[#F1EFEA] p-1 text-sm font-semibold">
            {[["shared", "Shared"], ["classic", "Classic"]].map(([id, label]) => (
              <button key={id} type="button" disabled={busy} onClick={() => choose(id)} aria-pressed={data.engine === id}
                className={`h-8 px-4 rounded-lg transition-colors ${data.engine === id ? "bg-white text-[#121212] shadow-sm" : "text-[#6B6A66]"}`}>{label}</button>
            ))}
          </div>
        )}
      </div>
      {shared && (
        <div className="mt-4 rounded-xl bg-[#F7F6F2] p-4 text-sm text-[#2B2A28]">
          {m ? (
            <ul className="space-y-1">
              <li><span className="text-vision-muted">Mood:</span> {m.mood}</li>
              <li><span className="text-vision-muted">Thinking:</span> {m.thought || "-"}</li>
              <li><span className="text-vision-muted">Last action:</span> {m.lastAction || "-"}{m.busy ? " (doing it now)" : ""}</li>
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-vision-muted"><Sparkles size={14} /> {data?.running ? "Waking up..." : "Starts as soon as the robot is connected and its camera sends a picture."}</p>
          )}
        </div>
      )}
      {problem && <p className="mt-3 text-sm text-[#B42318]" role="alert">{problem}</p>}
    </div>
  );
}
