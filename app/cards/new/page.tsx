import { requireOnboarded } from "@/lib/auth/session";
import { NewCardForm } from "./NewCardForm";

export const dynamic = "force-dynamic";

export default async function NewCardPage() {
  await requireOnboarded();

  return <NewCardForm />;
}
