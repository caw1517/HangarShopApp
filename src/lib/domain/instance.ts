import { ShopFoundationStore } from "./store";

/** Module-level singleton so the demo app and its mutations persist across client re-renders. */
export const domainStore = new ShopFoundationStore();
