import { Suspense } from "react";
import { AppRoot } from "@/components/AppRoot";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppRoot />
    </Suspense>
  );
}
