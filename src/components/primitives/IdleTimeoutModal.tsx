"use client";

import { useDomain } from "@/lib/domain/context";

/**
 * Idle-session warning dialog driven by the per-Shop idle_timeout_minutes
 * setting. It appears once the session crosses the warning threshold; letting
 * the clock run out (or pressing "Sign out now") actually ends the session via
 * domain.signOut(), which signs out of Supabase when configured and returns the
 * app to the signed-out screen. The timed-out state is handled by that screen,
 * not here, so this dialog only covers the "warning" window.
 */
export function IdleTimeoutModal() {
  const domain = useDomain();

  if (domain.idleState !== "warning" || domain.signedOut) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-overlay ring-1 ring-inset ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Still there?</h2>
        <p className="mt-2 text-sm text-slate-700">
          This shop signs out idle sessions after {domain.idleMinutes} minutes. You&apos;ll be signed out shortly
          unless you stay active.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={domain.idleReset}
            className="uui-btn-secondary min-h-11 px-3.5 py-2 text-sm font-medium"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={() => domain.signOut("manual")}
            className="uui-btn-primary min-h-11 px-3.5 py-2 text-sm font-medium"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
