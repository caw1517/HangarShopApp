"use client";

import { useDomain } from "@/lib/domain/context";

/**
 * Idle session warning/sign-out banner driven by the configurable per-Shop
 * idle_timeout_minutes setting. Advanced deterministically via
 * domain.idlePreviewWarning()/idlePreviewTimeout() rather than real wall-clock
 * timers so reviewers and Playwright screenshots can exercise it on demand.
 */
export function IdleTimeoutModal() {
  const domain = useDomain();

  if (domain.idleState === "active") return null;

  const isTimedOut = domain.idleState === "timed-out";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-inset ring-[#e4e7ec]">
        <h2 className="text-base font-semibold text-[#101828]">
          {isTimedOut ? "You've been signed out" : "Still there?"}
        </h2>
        <p className="mt-2 text-sm text-[#344054]">
          {isTimedOut
            ? "Your session ended after the configured idle timeout."
            : `This Shop signs out idle sessions after ${domain.idleMinutes} minutes. You'll be signed out shortly unless you stay active.`}
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          {!isTimedOut && (
            <button type="button" onClick={domain.idleReset} className="uui-btn-secondary rounded-lg px-3.5 py-2 text-sm font-medium">
              Stay signed in
            </button>
          )}
          <button
            type="button"
            onClick={domain.idleReset}
            className="uui-btn-primary rounded-lg px-3.5 py-2 text-sm font-medium"
          >
            {isTimedOut ? "Sign in again" : "Sign out now"}
          </button>
        </div>
      </div>
    </div>
  );
}
