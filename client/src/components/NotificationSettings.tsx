import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellOff, Send, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  isPushSupported,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionData,
  getNotificationPermission
} from "@/lib/pushNotifications";

interface PushStatus {
  configured: boolean;
  subscribed: boolean;
  settings: {
    dailyReminder: boolean;
    reminderTime: string;
    targetAlerts: boolean;
  } | null;
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const { data: pushStatus, isLoading } = useQuery<PushStatus>({
    queryKey: ["/api/push/status"],
  });

  useEffect(() => {
    registerServiceWorker();
    getNotificationPermission().then(setPermission);
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async (subscriptionData: { endpoint: string; p256dh: string; auth: string }) => {
      const res = await apiRequest("POST", "/api/push/subscribe", subscriptionData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
      toast({ title: t("common.success"), description: t("notifications.subscribed") });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      await unsubscribeFromPush();
      return apiRequest("DELETE", "/api/push/unsubscribe");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
      toast({ title: t("common.success"), description: t("notifications.notSubscribed") });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<{ dailyReminder: boolean; reminderTime: string; targetAlerts: boolean }>) => {
      const res = await apiRequest("PATCH", "/api/push/settings", settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
      toast({ title: t("common.success"), description: t("notifications.settingsSaved") });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/push/test");
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: t("common.success"), description: t("notifications.testSent") });
      } else {
        toast({ title: t("common.error"), description: t("notifications.testFailed"), variant: "destructive" });
      }
    },
  });

  const handleEnableNotifications = async () => {
    if (!isPushSupported()) {
      toast({ title: t("common.error"), description: t("notifications.notSupported"), variant: "destructive" });
      return;
    }

    setIsEnabling(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast({ title: t("common.error"), description: t("notifications.permissionDenied"), variant: "destructive" });
        return;
      }

      const subscription = await subscribeToPush();
      if (subscription) {
        const data = getSubscriptionData(subscription);
        await subscribeMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
      toast({ title: t("common.error"), description: t("notifications.testFailed"), variant: "destructive" });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisableNotifications = async () => {
    await unsubscribeMutation.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = pushStatus?.subscribed;
  const settings = pushStatus?.settings;
  const isSupported = isPushSupported();

  return (
    <Card data-testid="card-notification-settings">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t("notifications.title")}
            </CardTitle>
            <CardDescription>{t("notifications.subtitle")}</CardDescription>
          </div>
          {isSubscribed && (
            <Badge variant="secondary">{t("notifications.subscribed")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">{t("notifications.notSupported")}</p>
        ) : !isSubscribed ? (
          <div className="space-y-4">
            {permission === "denied" && (
              <p className="text-sm text-destructive">{t("notifications.permissionDenied")}</p>
            )}
            <Button
              onClick={handleEnableNotifications}
              disabled={isEnabling || permission === "denied"}
              data-testid="button-enable-notifications"
            >
              <Bell className="w-4 h-4 mr-2" />
              {isEnabling ? t("notifications.enabling") : t("notifications.enableNotifications")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-reminder">{t("notifications.dailyReminder")}</Label>
                <p className="text-sm text-muted-foreground">{t("notifications.dailyReminderDesc")}</p>
              </div>
              <Switch
                id="daily-reminder"
                checked={settings?.dailyReminder ?? true}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ dailyReminder: checked })}
                data-testid="switch-daily-reminder"
              />
            </div>

            {settings?.dailyReminder && (
              <div className="flex items-center gap-4">
                <Label htmlFor="reminder-time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("notifications.reminderTime")}
                </Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={settings?.reminderTime ?? "08:00"}
                  onChange={(e) => updateSettingsMutation.mutate({ reminderTime: e.target.value })}
                  className="w-32"
                  data-testid="input-reminder-time"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="target-alerts">{t("notifications.targetAlerts")}</Label>
                <p className="text-sm text-muted-foreground">{t("notifications.targetAlertsDesc")}</p>
              </div>
              <Switch
                id="target-alerts"
                checked={settings?.targetAlerts ?? true}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ targetAlerts: checked })}
                data-testid="switch-target-alerts"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => testNotificationMutation.mutate()}
                disabled={testNotificationMutation.isPending}
                data-testid="button-test-notification"
              >
                <Send className="w-4 h-4 mr-2" />
                {t("notifications.testNotification")}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDisableNotifications}
                disabled={unsubscribeMutation.isPending}
                data-testid="button-disable-notifications"
              >
                <BellOff className="w-4 h-4 mr-2" />
                {t("notifications.disableNotifications")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
