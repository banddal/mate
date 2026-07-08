import { fail, ok } from "@/lib/api/responses";
import { getVerifiedAdmin } from "@/lib/auth/admin";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createBannedWordSchema = z.object({
  word: z.string().trim().min(2).max(80),
  severity: z.enum(["block", "flag"]),
  categoryHint: z.string().trim().max(80).nullable().optional()
});

const deleteBannedWordSchema = z.object({
  wordId: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const auth = await getVerifiedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createBannedWordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_BANNED_WORD", message: "금지어 내용을 확인해주세요." }, 400);
  }

  const { word, severity, categoryHint } = parsed.data;

  if (!hasServiceEnv()) {
    return ok({
      bannedWord: {
        id: `demo-banned-word-${Date.now()}`,
        word,
        severity,
        category_hint: categoryHint || null
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: bannedWord, error } = await admin
    .from("banned_words")
    .insert({
      word,
      severity,
      category_hint: categoryHint || null
    })
    .select("id, word, severity, category_hint")
    .single();

  if (error || !bannedWord) {
    return fail({ code: "BANNED_WORD_CREATE_FAILED", message: "금지어를 추가하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: auth.userId,
    action_type: "banned_word_create",
    target_id: bannedWord.id,
    notes: `${severity}:${word}`
  });

  return ok({ bannedWord });
}

export async function DELETE(request: Request) {
  const auth = await getVerifiedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = deleteBannedWordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_BANNED_WORD", message: "삭제할 금지어를 확인해주세요." }, 400);
  }

  const { wordId } = parsed.data;

  if (!hasServiceEnv() || wordId.startsWith("demo-")) {
    return ok({
      bannedWord: {
        id: wordId,
        deleted: true
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { error } = await admin.from("banned_words").delete().eq("id", wordId);

  if (error) {
    return fail({ code: "BANNED_WORD_DELETE_FAILED", message: "금지어를 삭제하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: auth.userId,
    action_type: "banned_word_delete",
    target_id: wordId,
    notes: "금지어 삭제"
  });

  return ok({
    bannedWord: {
      id: wordId,
      deleted: true
    }
  });
}
