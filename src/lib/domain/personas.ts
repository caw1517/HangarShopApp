import { DEVON_USER_ID, ELENA_USER_ID, MARCUS_USER_ID, PLATFORM_OWNER } from "./seed";
import type { Principal } from "./types";

export type PersonaKey = "admin" | "inspector" | "mechanic" | "platform-owner";

export interface PersonaOption {
  key: PersonaKey;
  label: string;
  principal: Principal;
}

export const PERSONAS: Record<PersonaKey, PersonaOption> = {
  admin: {
    key: "admin",
    label: "Admin (Elena Rostova)",
    principal: { userId: ELENA_USER_ID, email: "elena.rostova@apexchartermx.example", fullName: "Elena Rostova" },
  },
  inspector: {
    key: "inspector",
    label: "Inspector + Cal Designee (Marcus Vance)",
    principal: { userId: MARCUS_USER_ID, email: "marcus.vance@apexchartermx.example", fullName: "Marcus Vance" },
  },
  mechanic: {
    key: "mechanic",
    label: "Mechanic (Devon Brooks)",
    principal: { userId: DEVON_USER_ID, email: "devon.brooks@apexchartermx.example", fullName: "Devon Brooks" },
  },
  "platform-owner": {
    key: "platform-owner",
    label: "Platform Owner (Provisioning Only)",
    principal: PLATFORM_OWNER,
  },
};

export const PERSONA_ORDER: PersonaKey[] = ["admin", "inspector", "mechanic", "platform-owner"];
