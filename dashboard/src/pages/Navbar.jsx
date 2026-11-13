import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../auth/authStore";
import { logout } from "../auth/AuthProvider";

export function Navbar() {
  const { user, initialized } = useAuthStore();
  const [toast, setToast] = useState("");
  const seen = useRef(null); // last known logged-in state, to spot a change
  const timer = useRef(null);

  useEffect(() => {
    if (!initialized) return;
    const now = !!user;
    if (seen.current === true && now === false) show("Logged out");
    if (seen.current === false && now === true) show("Logged in");
    seen.current = now;
  }, [user, initialized]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function show(msg) {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }

  return (
    <>
    <nav className="fixed top-10 left-0 right-0 mx-auto w-max z-50">
        <div className="flex items-center bg-[#110f15] text-white/90 rounded-full py-2 px-2 pl-3 shadow-2xl border border-white/5">
          <div className="flex items-center justify-center mr-4">
            <img className="w-8 opacity-90" src="/images/Vision.png" alt="Logo" />
          </div>
          <div className="flex cursor-pointer items-center gap-4 text-[14px] font-medium mr-6">
            <a href="#Features" className="flex items-center gap-1 hover:text-white transition-opacity opacity-80 hover:opacity-100">Features</a>
            <a href="#Pricing" className="opacity-80 hover:opacity-100 transition-opacity">Pricing</a>
            <a href="/blog" className="opacity-80 hover:opacity-100 transition-opacity">Blog</a>
            {/* <a href="/docs" className="opacity-80 hover:opacity-100 transition-opacity">Docs</a> */}
          </div>
          <div className="flex items-center min-h-[36px]">
            {user ? (
              <>
                <Link to="/dashboard" className="text-[14px] cursor-pointer font-medium px-4 opacity-80 hover:opacity-100 transition-opacity">Dashboard</Link>
                <button type="button" onClick={() => logout()} className="bg-white cursor-pointer hover:bg-gray-200 text-black text-[14px] font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-sm vn-pop">Log out</button>
              </>
            ) : initialized ? (
              <>
                <a href="/login" className="text-[14px] cursor-pointer font-medium px-4 opacity-80 hover:opacity-100 transition-opacity">Login</a>
                <a href="/register" className="bg-white cursor-pointer hover:bg-gray-200 text-black text-[14px] font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-sm vn-pop">Register</a>
              </>
            ) : null /* still asking the server who you are: show neither, so the buttons do not flash */}
          </div>
        </div>
      </nav>
      {toast && (
        <div role="status" className="vn-toast fixed bottom-6 right-6 z-50 bg-[#110f15] text-white text-sm font-medium px-5 py-3 rounded-lg border border-white/10 shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}
