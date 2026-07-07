import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasCashPaymentPattern } from "@/lib/cards/cash-pattern";

export type ModerationDecision =
  | { status: "open"; reason: null }
  | { status: "pending_review"; reason: "FLAGGED_WORD" | "CASH_PATTERN" }
  | { status: "blocked"; reason: "BLOCKED_WORD" };

export async function moderateCardText(fields: string[]): Promise<ModerationDecision> {
  const text = fields.filter(Boolean).join(" ");

  if (hasCashPaymentPattern(text)) {
    return { status: "pending_review", reason: "CASH_PATTERN" };
  }

  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin.from("banned_words").select("word, severity");

  if (error) {
    throw new Error(error.message);
  }

  for (const item of data ?? []) {
    if (!item.word || !text.includes(item.word)) {
      continue;
    }

    if (item.severity === "block") {
      return { status: "blocked", reason: "BLOCKED_WORD" };
    }

    if (item.severity === "flag") {
      return { status: "pending_review", reason: "FLAGGED_WORD" };
    }
  }

  return { status: "open", reason: null };
}
