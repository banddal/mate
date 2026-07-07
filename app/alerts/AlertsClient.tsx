"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2, Plus, Trash2 } from "lucide-react";

type SubscriptionRow = {
  id: string;
  location: string;
  time_pattern: string;
  category: string;
  created_at: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

type AlertsClientProps = {
  categories: string[];
};

export function AlertsClient({ categories }: AlertsClientProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
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
            <h2 className="text-base font-bold tracking-normal text-ink">브라우저 푸시</h2>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              조건에 맞는 카드나 승인 결과가 생기면 이 기기로 알려드립니다.
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
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
        <h2 className="text-base font-bold tracking-normal text-ink">상황 템플릿 추가</h2>
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
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className="rounded-lg border border-line bg-white p-4 text-sm leading-6 text-ink/60 shadow-soft">
            아직 저장한 상황이 없습니다. 관심 있는 장소와 시간대를 저장하면 새 카드가 공개될 때 알림을 받을 수 있어요.
          </p>
        )}
      </section>
    </div>
  );
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
