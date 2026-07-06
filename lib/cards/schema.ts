import { z } from "zod";
import { CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";

const allowedCategories = CARD_CATEGORY_OPTIONS.map((option) => option.label);

export const createCardSchema = z
  .object({
    title: z.string().trim().min(4).max(60),
    category: z.string().trim().refine((value) => allowedCategories.includes(value)),
    eventDatetime: z.string().datetime(),
    location: z.string().trim().min(2).max(80),
    capacity: z.coerce.number().int().min(1).max(12),
    hostOffer: z.string().trim().min(2).max(120),
    costInfo: z.string().trim().max(80).optional(),
    description: z.string().trim().min(10).max(800),
    deadlineAt: z.string().datetime()
  })
  .refine((data) => new Date(data.eventDatetime).getTime() > Date.now(), {
    path: ["eventDatetime"],
    message: "EVENT_IN_PAST"
  })
  .refine(
    (data) => new Date(data.deadlineAt).getTime() < new Date(data.eventDatetime).getTime(),
    {
      path: ["deadlineAt"],
      message: "DEADLINE_AFTER_EVENT"
    }
  );

export type CreateCardInput = z.infer<typeof createCardSchema>;
