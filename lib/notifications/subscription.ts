import { z } from "zod";

/**
 * 브라우저 PushSubscription.toJSON() 형태를 받는다.
 * { endpoint, keys: { p256dh, auth } }
 */
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url()
});

export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
