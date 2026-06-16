import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellOff, Send, Clock, MapPin, Play } from "lucide-react";
import { NOTIFICATION_SOUNDS, playNotificationSound, unlockAudio } from "@/lib/sounds";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSavedLocation, saveLocation, reverseGeocode, formatCoords } from "@/lib/location";
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
    sholatReminder: boolean;
    hasLocation: boolean;
    notificationSound: string;
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
    mutationFn: async (subscriptionData: { endpoint: string; p256dh: string; auth: string; timezone?: string }) => {
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

  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [savedPlaceName, setSavedPlaceName] = useState<string | null>(
    () => getSavedLocation()?.placeName ?? null,
  );
  const [savedCoords, setSavedCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const s = getSavedLocation();
    return s ? { lat: s.latitude, lng: s.longitude } : null;
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<{ dailyReminder: boolean; reminderTime: string; targetAlerts: boolean; sholatReminder: boolean; timezone: string; latitude: number; longitude: number; notificationSound: string }>) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
      const res = await apiRequest("PATCH", "/api/push/settings", { ...settings, timezone });
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
    onSuccess: async (data: any) => {
      if (data.success) {
        toast({ title: t("common.success"), description: t("notifications.testSent") });
        return;
      }
      // Map server-reported reason to a clear, actionable message.
      const reason: string | undefined = data?.reason;
      let description = t("notifications.testFailed");
      if (reason === "no_subscription") {
        description = t("notifications.testFailedNoSubscription");
      } else if (reason === "expired") {
        description = t("notifications.testFailedExpired");
      } else if (reason === "not_configured") {
        description = t("notifications.testFailedNotConfigured");
      } else if (reason === "push_service_error") {
        description = t("notifications.testFailedPushServiceError", {
          status: data?.statusCode ?? "?",
        });
      }
      toast({ title: t("common.error"), description, variant: "destructive" });

      // If iOS/desktop pushed back with a stale subscription, the server
      // already deleted it. Force the client to drop its dead push token
      // so the user can simply tap "Enable" again.
      if (reason === "expired" || reason === "no_subscription") {
        try {
          await unsubscribeFromPush();
        } catch {
          // ignore — best effort
        }
        queryClient.invalidateQueries({ queryKey: ["/api/push/status"] });
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
      if (!subscription) {
        toast({ title: t("common.error"), description: t("notifications.subscriptionFailed"), variant: "destructive" });
        return;
      }
      const data = getSubscriptionData(subscription);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
      await subscribeMutation.mutateAsync({ ...data, timezone });
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
        ) : pushStatus?.configured === false ? (
          <p className="text-sm text-muted-foreground">{t("notifications.serverNotConfigured")}</p>
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sholat-reminder">{t("notifications.sholatReminder")}</Label>
                <p className="text-sm text-muted-foreground">{t("notifications.sholatReminderDesc")}</p>
              </div>
              <Switch
                id="sholat-reminder"
                checked={settings?.sholatReminder ?? true}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ sholatReminder: checked })}
                data-testid="switch-sholat-reminder"
              />
            </div>

            {settings?.sholatReminder && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm" data-testid="text-notification-location">
                  <MapPin className="w-4 h-4" />
                  {settings?.hasLocation ? (
                    <span className="text-muted-foreground">
                      {savedPlaceName
                        ? savedPlaceName
                        : savedCoords
                        ? formatCoords(savedCoords.lat, savedCoords.lng)
                        : t("notifications.locationSaved")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("notifications.locationRequired")}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdatingLocation}
                  onClick={async () => {
                    setIsUpdatingLocation(true);
                    try {
                      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000 });
                      });
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      updateSettingsMutation.mutate({ latitude: lat, longitude: lng });
                      setSavedCoords({ lat, lng });
                      setSavedPlaceName(null);
                      saveLocation(lat, lng, null);
                      try {
                        const controller = new AbortController();
                        const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
                        const name = await reverseGeocode(lat, lng, lang, controller.signal);
                        if (name) {
                          setSavedPlaceName(name);
                          saveLocation(lat, lng, name);
                        }
                      } catch {}
                    } catch {
                      toast({ title: t("common.error"), description: t("notifications.locationRequired"), variant: "destructive" });
                    } finally {
                      setIsUpdatingLocation(false);
                    }
                  }}
                  data-testid="button-update-location"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  {t("notifications.updateLocation")}
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4" />
                  {t("notifications.soundLabel")}
                </Label>
                <p className="text-sm text-muted-foreground mb-3">{t("notifications.soundDesc")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {NOTIFICATION_SOUNDS.map((sound) => {
                  const isSelected = (settings?.notificationSound ?? "chime") === sound.id;
                  return (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border bg-card hover:bg-accent"
                      }`}
                      onClick={() => updateSettingsMutation.mutate({ notificationSound: sound.id })}
                      data-testid={`button-sound-${sound.id}`}
                    >
                      <span className="text-sm font-medium">{t(sound.labelKey)}</span>
                      {sound.id !== "none" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            unlockAudio();
                            playNotificationSound(sound.id);
                          }}
                          className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`button-preview-${sound.id}`}
                          aria-label={`Preview ${sound.id}`}
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
