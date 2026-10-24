"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { domainStore } from "./instance";
import { IdleSessionTracker, type IdleSessionState } from "./idle-session";
import { PERSONAS, type PersonaKey } from "./personas";
import { ORG_APEX_ID } from "./seed";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ShopFoundationStore } from "./store";
import type { Principal } from "./types";

interface DomainContextValue {
  store: ShopFoundationStore;
  principal: Principal;
  personaKey: PersonaKey;
  setPersonaKey: (key: PersonaKey) => void;
  activeOrgId: string;
  setActiveOrgId: (orgId: string) => void;
  version: number;
  mutate: <T>(fn: (store: ShopFoundationStore) => T) => T;
  idleState: IdleSessionState;
  idleMinutes: number;
  idlePreviewWarning: () => void;
  idlePreviewTimeout: () => void;
  idleReset: () => void;
  signedOut: boolean;
  signOut: () => void;
  signInAgain: () => void;
}

const DomainContext = createContext<DomainContextValue | null>(null);

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [personaKey, setPersonaKey] = useState<PersonaKey>("admin");
  const [activeOrgId, setActiveOrgId] = useState<string>(ORG_APEX_ID);
  const [version, setVersion] = useState(0);
  const [idleState, setIdleState] = useState<IdleSessionState>("active");
  const [signedOut, setSignedOut] = useState(false);

  const principal = PERSONAS[personaKey].principal;

  let idleMinutes = 30;
  try {
    idleMinutes = domainStore.getOrganization(principal, activeOrgId).idle_timeout_minutes;
  } catch {
    idleMinutes = 30;
  }

  const idleTrackerRef = useRef<IdleSessionTracker>(new IdleSessionTracker(idleMinutes));
  const idleMinutesRef = useRef(idleMinutes);
  if (idleMinutesRef.current !== idleMinutes) {
    idleMinutesRef.current = idleMinutes;
    idleTrackerRef.current = new IdleSessionTracker(idleMinutes);
    setIdleState("active");
  }

  // Actually end the session: sign out of Supabase when a client is configured
  // (no-op in demo mode where env vars are absent), clear the local idle clock,
  // and drop to the signed-out screen.
  const signOut = useCallback(() => {
    const client = getSupabaseClient();
    if (client) void client.auth.signOut().catch(() => {});
    idleTrackerRef.current.reset();
    setIdleState("active");
    setSignedOut(true);
  }, []);

  const signInAgain = useCallback(() => {
    idleTrackerRef.current.reset();
    setIdleState("active");
    setSignedOut(false);
  }, []);

  // Reaching the idle timeout itself signs the user out, not just shows a dialog.
  useEffect(() => {
    if (idleState === "timed-out" && !signedOut) signOut();
  }, [idleState, signedOut, signOut]);

  useEffect(() => {
    const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart"] as const;
    const handleActivity = () => {
      setIdleState(idleTrackerRef.current.registerActivity());
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));

    const TICK_MS = 1000;
    const tick = window.setInterval(() => {
      setIdleState(idleTrackerRef.current.advance(TICK_MS));
    }, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      window.clearInterval(tick);
    };
  }, []);

  const mutate = <T,>(fn: (store: ShopFoundationStore) => T): T => {
    const result = fn(domainStore);
    setVersion((v) => v + 1);
    return result;
  };

  const value = useMemo<DomainContextValue>(
    () => ({
      store: domainStore,
      principal,
      personaKey,
      setPersonaKey: (key: PersonaKey) => {
        setPersonaKey(key);
      },
      activeOrgId,
      setActiveOrgId,
      version,
      mutate,
      idleState,
      idleMinutes,
      idlePreviewWarning: () => {
        idleTrackerRef.current.forceWarning();
        setIdleState(idleTrackerRef.current.state);
      },
      idlePreviewTimeout: () => {
        idleTrackerRef.current.forceTimeout();
        setIdleState(idleTrackerRef.current.state);
      },
      idleReset: () => {
        idleTrackerRef.current.reset();
        setIdleState(idleTrackerRef.current.state);
      },
      signedOut,
      signOut,
      signInAgain,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [principal, personaKey, activeOrgId, version, idleState, idleMinutes, signedOut, signOut, signInAgain],
  );

  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>;
}

export function useDomain(): DomainContextValue {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomain must be used within a DomainProvider");
  return ctx;
}
