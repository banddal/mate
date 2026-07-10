import { Suspense } from "react";
import { AuthConfirmClient } from "./AuthConfirmClient";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirmClient canUseDevAuth={isDevAuthBypassEnabled()} />
    </Suspense>
  );
}
