"use client";

import { useEffect } from "react";

/**
 * Wires the J/K (and ↑/↓) list navigation advertised in the v5.1 filter bar.
 * Ignores keystrokes while a text input/textarea/select is focused so typing
 * in the search box or a form field never hijacks selection.
 */
export function useListNav(ids: string[], selectedId: string | null, onSelect: (id: string) => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const isDown = e.key === "j" || e.key === "J" || e.key === "ArrowDown";
      const isUp = e.key === "k" || e.key === "K" || e.key === "ArrowUp";
      if (!isDown && !isUp) return;
      if (ids.length === 0) return;
      e.preventDefault();
      const idx = selectedId ? ids.indexOf(selectedId) : -1;
      const nextIdx = isDown
        ? idx < 0
          ? 0
          : Math.min(ids.length - 1, idx + 1)
        : idx < 0
          ? 0
          : Math.max(0, idx - 1);
      const nextId = ids[nextIdx];
      if (nextId) onSelect(nextId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ids, selectedId, onSelect]);
}
