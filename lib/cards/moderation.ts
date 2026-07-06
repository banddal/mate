import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

const amountPattern = /\d+\s*(원|만원|천원)/;
const paymentIntentPattern = /(드립니다|드려요|드릴게요|지불|송금|입금|사례|페이|용돈|보상)/;

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

function hasCashPaymentPattern(text: string) {
  return amountPattern.test(text) && paymentIntentPattern.test(text);
}
