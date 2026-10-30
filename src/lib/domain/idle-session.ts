export type IdleSessionState = "active" | "warning" | "timed-out";

/**
 * Deterministic idle-session state machine. Driven by explicit advance(ms) calls
 * rather than wall-clock timers so both the UI (via a ticking effect) and Vitest
 * (via direct advance() calls) get identical, reproducible behavior.
 */
export class IdleSessionTracker {
  private readonly idleTimeoutMs: number;
  private readonly warningLeadMs: number;
  private elapsedMs = 0;
  private _state: IdleSessionState = "active";

  constructor(idleTimeoutMinutes: number, warningLeadMinutes = 2) {
    this.idleTimeoutMs = idleTimeoutMinutes * 60_000;
    this.warningLeadMs = Math.min(warningLeadMinutes * 60_000, this.idleTimeoutMs);
  }

  get state(): IdleSessionState {
    return this._state;
  }

  get elapsedMilliseconds(): number {
    return this.elapsedMs;
  }

  get remainingMilliseconds(): number {
    return Math.max(this.idleTimeoutMs - this.elapsedMs, 0);
  }

  /** Advance the idle clock by `ms` and recompute state. No-op once timed-out. */
  advance(ms: number): IdleSessionState {
    if (this._state === "timed-out") return this._state;
    this.elapsedMs += ms;
    if (this.elapsedMs >= this.idleTimeoutMs) {
      this._state = "timed-out";
    } else if (this.elapsedMs >= this.idleTimeoutMs - this.warningLeadMs) {
      this._state = "warning";
    } else {
      this._state = "active";
    }
    return this._state;
  }

  /** Any user activity — clears the warning/timeout and restarts the idle clock. */
  reset(): void {
    this.elapsedMs = 0;
    this._state = "active";
  }

  /**
   * Background user activity (mousemove/keydown/etc.). Restarts the clock only
   * while the session is still "active". Once the warning dialog is showing, the
   * user must make an explicit choice ("Stay signed in" / "Sign out now"), so
   * ambient activity is ignored — otherwise the mousedown that precedes a
   * "Sign out now" click would reset the tracker and unmount the dialog before
   * the click itself lands, leaving the user stuck signed in.
   */
  registerActivity(): IdleSessionState {
    if (this._state === "active") this.reset();
    return this._state;
  }

  /** Force the warning state for UI preview/demo purposes without waiting out the real timeout. */
  forceWarning(): void {
    this.elapsedMs = Math.max(this.idleTimeoutMs - this.warningLeadMs, 0);
    this._state = "warning";
  }

  /** Force the timed-out state for UI preview/demo purposes. */
  forceTimeout(): void {
    this.elapsedMs = this.idleTimeoutMs;
    this._state = "timed-out";
  }
}
