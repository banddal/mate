import { z } from "zod";

export const cardFeedFilterSchema = z.object({
  period: z.enum(["all", "ten", "hour", "today", "week"]).default("all"),
  category: z.string().trim().max(40).optional()
});

export type CardFeedFilter = z.infer<typeof cardFeedFilterSchema>;
export type FeedDateWindow = {
  from?: Date;
  to?: Date;
  deadlineFrom?: Date;
  deadlineTo?: Date;
};

export function parseCardFeedFilters(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): CardFeedFilter {
  const getValue = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }

    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const parsed = cardFeedFilterSchema.safeParse({
    period: getValue("period") ?? "all",
    category: getValue("category") || undefined
  });

  return parsed.success ? parsed.data : { period: "all", category: undefined };
}

export function getFeedDateWindow(period: CardFeedFilter["period"]): FeedDateWindow {
  const now = new Date();

  if (period === "ten") {
    const end = new Date(now);
    end.setMinutes(end.getMinutes() + 10);
    return { deadlineFrom: now, deadlineTo: end };
  }

  if (period === "hour") {
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    return { deadlineFrom: now, deadlineTo: end };
  }

  if (period === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { deadlineFrom: now, deadlineTo: end };
  }

  if (period === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { deadlineFrom: now, deadlineTo: end };
  }

  return {};
}
