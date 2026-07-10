"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, BookmarkPlus, CheckCircle2, Clock3, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type SubscriptionRow = {
  id: string;
  location: string;
  time_pattern: string;
  category: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  attempts: number;
  created_at: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

type AlertsClientProps = {
  categories: string[];
};

const suggestedTemplates = [
  { location: "잠실", timePattern: "이번 주말", category: "스포츠 직관" },
  { location: "성수", timePattern: "평일 저녁", category: "전시" },
  { location: "홍대", timePattern: "금요일 밤", category: "공연" }
];

export function AlertsClient({ categories }: AlertsClientProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [location, setLocation] = useState("");
  const [timePattern, setTimePattern] = useState("이번 주말");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState("");
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [isPushBusy, setIsPushBusy] = useState(false);

  const canCreate = useMemo(
    () => location.trim().length > 0 && timePattern.trim().length > 0 && category.trim().length > 0,
    [category, location, timePattern]
  );

  useEffect(() => {
    loadSubscriptions();
    loadNotifications();
    preparePushState();
  }, []);

  async function loadSubscriptions() {
    setIsLoading(true);
    const response = await fetch("/api/subscriptions");
    const payload = (await response.json().catch(() => null)) as ApiResponse<{
      subscriptions: SubscriptionRow[];
    }> | null;
    setIsLoading(false);

    if (!response.ok || payload?.error || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "구독 목록을 불러오지 못했어요.");
      return;
    }

    setSubscriptions(payload.data.subscriptions);
  }

  async function loadNotifications() {
    const response = await fetch("/api/notifications");
    const payload = (await response.json().catch(() => null)) as ApiResponse<{
      notifications: NotificationRow[];
    }> | null;

    if (!response.ok || payload?.error || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "알림을 불러오지 못했어요.");
      return;
    }

    setNotifications(payload.data.notifications);
  }

  async function preparePushState() {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);

    if (!supported) {
      setPushReady(false);
      return;
    }

    const configResponse = await fetch("/api/push/config");
    const configPayload = (await configResponse.json().catch(() => null)) as ApiResponse<{
      enabled: boolean;
      vapidPublicKey: string | null;
    }> | null;

    if (!configResponse.ok || !configPayload?.data?.enabled || !configPayload.data.vapidPublicKey) {
      setPushReady(false);
      return;
    }

    setVapidPublicKey(configPayload.data.vapidPublicKey);
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();

    setPushReady(true);
    setPushEnabled(Boolean(subscription));
    setPushEndpoint(subscription?.endpoint ?? "");
  }

  async function submitSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNoticeMessage("");
    setIsSaving(true);

    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, timePattern, category })
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<{
      subscription: SubscriptionRow;
    }> | null;
    setIsSaving(false);

    if (!response.ok || payload?.error || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "구독을 저장하지 못했어요.");
      return;
    }

    const nextSubscription = payload.data.subscription;
    setSubscriptions((current) => [nextSubscription, ...current]);
    setLocation("");
    setNoticeMessage("상황 알림을 저장했어요.");
  }

  async function deleteSubscription(subscriptionId: string) {
    setErrorMessage("");
    setNoticeMessage("");

    const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
      method: "DELETE"
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse<{ deleted: boolean }> | null;

    if (!response.ok || payload?.error) {
      setErrorMessage(payload?.error?.message ?? "구독을 삭제하지 못했어요.");
      return;
    }

    setSubscriptions((current) => current.filter((subscription) => subscription.id !== subscriptionId));
    setNoticeMessage("상황 알림을 삭제했어요.");
  }

  async function enablePush() {
    setErrorMessage("");
    setNoticeMessage("");

    if (!pushReady || !vapidPublicKey) {
      setErrorMessage("브라우저 푸시를 아직 사용할 수 없어요.");
      return;
    }

    setIsPushBusy(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setErrorMessage("브라우저 알림 권한이 허용되지 않았어요.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok || payload?.error) {
        setErrorMessage(payload?.error?.message ?? "푸시 구독을 저장하지 못했어요.");
        return;
      }

      setPushEnabled(true);
      setPushEndpoint(subscription.endpoint);
      setNoticeMessage("브라우저 푸시 알림을 켰어요.");
    } catch {
      setErrorMessage("푸시 알림을 켜는 중 문제가 생겼어요.");
    } finally {
      setIsPushBusy(false);
    }
  }

  async function disablePush() {
    setErrorMessage("");
    setNoticeMessage("");
    setIsPushBusy(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      } else if (pushEndpoint) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: pushEndpoint })
        });
      }

      setPushEnabled(false);
      setPushEndpoint("");
      setNoticeMessage("브라우저 푸시 알림을 껐어요.");
    } catch {
      setErrorMessage("푸시 알림을 끄는 중 문제가 생겼어요.");
    } finally {
      setIsPushBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-normal text-ink">내 활동 알림</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              신청, 승인, 후기처럼 내가 처리해야 하는 일이 이곳에 쌓입니다.
            </p>
          </div>
          <span className="rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">
            {notifications.length}건
          </span>
        </div>
        {notifications.length > 0 ? (
          <div className="grid gap-2">
            {notifications.map((notification) => (
              <ActivityNotice
                key={notification.id}
                icon={getNotificationIcon(notification.type)}
                title={getNotificationTitle(notification)}
                body={getNotificationBody(notification)}
                meta={`${formatDateTime(notification.created_at)} · ${getNotificationStatusLabel(notification.status)}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <ActivityNotice icon={<Clock3 className="h-4 w-4" aria-hidden />} title="신청 상태" body="대기, 승인, 마감 상태가 생기면 여기에 표시됩니다." />
            <ActivityNotice icon={<MessageCircle className="h-4 w-4" aria-hidden />} title="Mate Room" body="승인 후 열린 Room과 조율 메시지를 놓치지 않게 합니다." />
            <ActivityNotice icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} title="후기 요청" body="만남 종료 후 필요한 사실 확인만 남깁니다." />
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-normal text-ink">브라우저 푸시</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              내 활동 알림과 저장한 상황 알림을 이 기기로 받을 수 있습니다.
            </p>
          </div>
          <span
            className={
              pushEnabled
                ? "rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss"
                : "rounded-full bg-paper px-2 py-1 text-xs font-semibold text-ink/50"
            }
          >
            {pushEnabled ? "켜짐" : "꺼짐"}
          </span>
        </div>

        {!pushSupported ? (
          <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/60">
            이 브라우저는 Web Push를 지원하지 않아요.
          </p>
        ) : !pushReady ? (
          <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/60">
            서버의 VAPID 키가 설정되면 푸시를 켤 수 있어요.
          </p>
        ) : (
          <button
            type="button"
            onClick={pushEnabled ? disablePush : enablePush}
            disabled={isPushBusy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md mate-cta px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPushBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : pushEnabled ? (
              <BellOff className="h-4 w-4" aria-hidden />
            ) : (
              <Bell className="h-4 w-4" aria-hidden />
            )}
            {pushEnabled ? "푸시 알림 끄기" : "푸시 알림 켜기"}
          </button>
        )}
      </section>

      <form className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft" onSubmit={submitSubscription}>
        <h2 className="text-base font-bold tracking-normal text-ink">관심 상황 저장</h2>
        <p className="text-sm leading-6 text-ink/60">
          사람을 구독하지 않고 장소, 시간대, 카테고리 조합만 저장합니다.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestedTemplates
            .filter((template) => categories.includes(template.category))
            .map((template) => (
              <button
                key={`${template.location}-${template.timePattern}-${template.category}`}
                type="button"
                onClick={() => {
                  setLocation(template.location);
                  setTimePattern(template.timePattern);
                  setCategory(template.category);
                }}
                className="flex min-h-9 shrink-0 items-center rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink/65 hover:border-moss hover:text-ink"
              >
                {template.location} · {template.timePattern}
              </button>
            ))}
        </div>
        <input
          className="field-input text-sm"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="장소 예: 잠실, 성수, 홍대"
        />
        <input
          className="field-input text-sm"
          value={timePattern}
          onChange={(event) => setTimePattern(event.target.value)}
          placeholder="시간대 예: 이번 주말, 평일 저녁"
        />
        <select
          className="field-input text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSaving || !canCreate}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md mate-cta px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          상황 알림 저장
        </button>
      </form>

      {noticeMessage ? <p className="rounded-md bg-moss/10 px-3 py-2 text-sm font-semibold text-moss">{noticeMessage}</p> : null}
      {errorMessage ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-normal text-ink">저장한 상황</h2>
          <span className="text-xs font-semibold text-ink/45">{subscriptions.length}/20</span>
        </div>

        {isLoading ? (
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-line bg-white shadow-soft">
            <Loader2 className="h-5 w-5 animate-spin text-moss" aria-hidden />
          </div>
        ) : subscriptions.length > 0 ? (
          <div className="space-y-2">
            {subscriptions.map((subscription) => (
              <article
                key={subscription.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-soft"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                      {subscription.category}
                    </span>
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/55">
                      {subscription.time_pattern}
                    </span>
                  </div>
                  <p className="truncate text-sm font-semibold text-ink">{subscription.location}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSubscription(subscription.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink/60 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  aria-label="상황 알림 삭제"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookmarkPlus className="h-4 w-4" aria-hidden />}
            title="아직 저장한 상황이 없습니다."
            body="관심 있는 장소와 시간대를 저장하면 새 카드가 공개될 때 알림을 받을 수 있어요."
          >
            <button
              type="button"
              onClick={() => {
                const [firstTemplate] = suggestedTemplates.filter((template) => categories.includes(template.category));
                if (firstTemplate) {
                  setLocation(firstTemplate.location);
                  setTimePattern(firstTemplate.timePattern);
                  setCategory(firstTemplate.category);
                }
              }}
              className="mt-4 flex min-h-10 w-full items-center justify-center rounded-md mate-cta px-3 text-sm font-semibold text-white"
            >
              추천 상황 채우기
            </button>
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function ActivityNotice({
  icon,
  title,
  body,
  meta
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-paper/70 px-3 py-3">
      <span className="mt-0.5 text-moss">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-6 text-ink/60">{body}</p>
        {meta ? <p className="mt-1 text-xs font-semibold text-ink/38">{meta}</p> : null}
      </div>
    </div>
  );
}

function getNotificationIcon(type: string) {
  if (type === "application_resolved") {
    return <CheckCircle2 className="h-4 w-4" aria-hidden />;
  }

  if (type === "subscription_match") {
    return <Bell className="h-4 w-4" aria-hidden />;
  }

  if (type === "card_deadline_imminent") {
    return <Clock3 className="h-4 w-4" aria-hidden />;
  }

  if (type === "report_status_change") {
    return <MessageCircle className="h-4 w-4" aria-hidden />;
  }

  return <Bell className="h-4 w-4" aria-hidden />;
}

function getNotificationTitle(notification: NotificationRow) {
  const cardTitle = getPayloadText(notification.payload, "cardTitle");

  if (notification.type === "application_resolved") {
    return "신청 결과";
  }

  if (notification.type === "subscription_match") {
    return "관심 상황 매칭";
  }

  if (notification.type === "card_deadline_imminent") {
    return "마감 임박";
  }

  if (notification.type === "report_status_change") {
    return "신고 처리";
  }

  if (notification.type === "card_review_resolved") {
    return "카드 검수 결과";
  }

  return cardTitle ? "활동 알림" : "새 알림";
}

function getNotificationBody(notification: NotificationRow) {
  const cardTitle = getPayloadText(notification.payload, "cardTitle");
  const outcome = getPayloadText(notification.payload, "outcome");

  if (notification.type === "application_resolved") {
    return outcome === "approved"
      ? `${cardTitle ?? "신청한 카드"} 참여가 확정됐어요.`
      : `${cardTitle ?? "신청한 카드"} 모집이 마감됐어요.`;
  }

  if (notification.type === "subscription_match") {
    return `${cardTitle ?? "새 카드"}가 저장한 관심 조건과 맞아요.`;
  }

  if (notification.type === "card_deadline_imminent") {
    return `${cardTitle ?? "내 카드"} 마감이 가까워지고 있어요.`;
  }

  if (notification.type === "report_status_change") {
    return "신고 상태가 업데이트됐어요.";
  }

  if (notification.type === "card_review_resolved") {
    return `${cardTitle ?? "내 카드"} 검수 결과가 나왔어요.`;
  }

  return cardTitle ?? "확인할 활동이 생겼어요.";
}

function getPayloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function getNotificationStatusLabel(status: NotificationRow["status"]) {
  const labels = {
    pending: "발송 대기",
    sent: "발송됨",
    failed: "발송 실패"
  };

  return labels[status];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
