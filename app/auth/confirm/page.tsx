import { Suspense } from "react";
import { AuthConfirmClient } from "./AuthConfirmClient";

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <AuthConfirmClient />
    </Suspense>
  );
}
