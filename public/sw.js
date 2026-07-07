self.addEventListener("push", (event) => {
  const fallback = {
    type: "mate",
    payload: {}
  };
  const data = event.data ? event.data.json() : fallback;
  const notification = getNotificationCopy(data.type, data.payload || {});

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: {
        url: notification.url
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/feed";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    })
  );
});

function getNotificationCopy(type, payload) {
  if (type === "application_resolved") {
    return {
      title: "Mate가 확정됐어요",
      body: "확정된 방에서 만남 정보를 확인해보세요.",
      url: payload.roomId ? `/rooms/${payload.roomId}` : "/feed"
    };
  }

  if (type === "card_review_resolved") {
    return {
      title: payload.outcome === "approved" ? "카드가 공개됐어요" : "카드가 반려됐어요",
      body: payload.outcome === "approved" ? "피드에서 내 상황 카드를 확인할 수 있어요." : "운영 기준에 맞춰 내용을 다시 확인해주세요.",
      url: payload.cardId ? `/cards/${payload.cardId}` : "/feed"
    };
  }

  if (type === "subscription_match") {
    return {
      title: "관심 상황에 맞는 카드가 열렸어요",
      body: payload.category ? `${payload.category} 카드가 새로 공개됐어요.` : "새 상황 카드가 공개됐어요.",
      url: payload.cardId ? `/cards/${payload.cardId}` : "/feed"
    };
  }

  if (type === "card_deadline_imminent") {
    return {
      title: "신청 마감이 가까워요",
      body: payload.pendingCount ? `${payload.pendingCount}명의 신청을 확인해보세요.` : "신청자를 확인해보세요.",
      url: payload.cardId ? `/cards/${payload.cardId}/applicants` : "/feed"
    };
  }

  if (type === "report_status_change") {
    return {
      title: "신고 처리 상태가 바뀌었어요",
      body: "운영자가 신고 내용을 확인했어요.",
      url: "/feed"
    };
  }

  return {
    title: "Mate 알림",
    body: "새 소식이 있어요.",
    url: "/feed"
  };
}
