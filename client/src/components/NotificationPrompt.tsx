import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  isPushSupported,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  getSubscriptionData,
} from "@/lib/pushNotifications";

const DISMISS_KEY = "notification_prompt_dismissed";
const DISMISS_DAYS = 7;

interface PushStatus {
  configured: boolean;
  subscribed: boolean;
  settings: {
    dailyReminder: boolean;
    reminderTime: string;
    targetAlerts: boolean;
    sholatReminder: boolean;
    hasLocation: boolean;
  } | null;
}

function isDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {}
}

function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

export function NotificationPrompt() {
  const { t } = useTranslation();
  const [isEnabling, setIsEnabling] = useState(false);
  const [dismissed, setDismissedState] = useState(true);

  const { data: pushStatus, isLoading } = useQuery<PushStatus>({
    queryKey: ["/api/push/status"],
  });

  useEffect(() => {
    setDismissedState(isDismissed());
    registerServiceWorker();
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async (data: { endpoint: string; p256dh: string; auth: string; timezone?: string; latitude?: number; longitude?: number }) => {
      const res = await apiRequest("POST", "/api/push/subscribe", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
    },
  });

  const handleEnable = async () => {
    if (!isPushSupported()) return;

    setIsEnabling(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        setDismissed();
        setDismissedState(true);
        return;
      }

      const subscription = await subscribeToPush();
      if (subscription) {
        const data = getSubscriptionData(subscription);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
        const location = await getUserLocation();
        await subscribeMutation.mutateAsync({
          ...data,
          timezone,
          ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        });
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
  };

  if (isLoading) return null;
  if (!isPushSupported()) return null;
  if (!pushStatus?.configured) return null;
  if (pushStatus?.subscribed) return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md" data-testid="notification-prompt">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-2 shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{t("notifications.promptTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("notifications.promptDesc")}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{t("notifications.promptLocationDesc")}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            data-testid="button-dismiss-notifications"
          >
            {t("notifications.promptDismiss")}
          </Button>
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isEnabling}
            data-testid="button-enable-notifications-prompt"
          >
            <Bell className="w-4 h-4 mr-1" />
            {isEnabling ? t("notifications.enabling") : t("notifications.promptEnable")}
          </Button>
        </div>
      </div>
    </div>
  );
}
