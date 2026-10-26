/**
 * Browser Notification Helper for mytree
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function sendLocalNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body: options?.body || "새로운 일정이 등록되거나 변경되었습니다.",
        icon: options?.icon || "/icons/icon.svg",
        tag: options?.tag,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      // In some mobile browsers, notification must be shown via service worker
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          options,
        });
      }
    }
  }
}
