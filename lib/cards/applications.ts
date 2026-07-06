import { z } from "zod";
import { APPLICATION_REASON_MAX_LENGTH } from "@/shared/config";

export const applyCardSchema = z.object({
  reasonText: z
    .string()
    .trim()
    .min(4)
    .max(APPLICATION_REASON_MAX_LENGTH)
});

export type ApplyCardInput = z.infer<typeof applyCardSchema>;
