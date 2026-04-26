import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Coordinates, PrayerTimes, CalculationMethod, Prayer } from "adhan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Compass,
  MapPin,
  Loader2,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Check,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  requested: boolean;
}

const LOCATION_STORAGE_KEY = "qibla_last_location";

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
const PRAYER_ORDER: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function getSavedLocation(): { latitude: number; longitude: number } | null {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function saveLocation(latitude: number, longitude: number) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ latitude, longitude }));
  } catch {}
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `sholat_done_${y}-${m}-${day}`;
}

function loadDoneState(): Record<PrayerKey, boolean> {
  const empty: Record<PrayerKey, boolean> = {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      fajr: !!parsed.fajr,
      dhuhr: !!parsed.dhuhr,
      asr: !!parsed.asr,
      maghrib: !!parsed.maghrib,
      isha: !!parsed.isha,
    };
  } catch {
    return empty;
  }
}

function saveDoneState(state: Record<PrayerKey, boolean>) {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(state));
  } catch {}
}

const PRAYER_ICONS: Record<PrayerKey, typeof Sun> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

export default function SholatPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const saved = getSavedLocation();
  const [location, setLocation] = useState<LocationState>({
    latitude: saved?.latitude ?? null,
    longitude: saved?.longitude ?? null,
    error: null,
    loading: false,
    requested: saved !== null,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [done, setDone] = useState<Record<PrayerKey, boolean>>(() => loadDoneState());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset done state when the date rolls over
  useEffect(() => {
    const checkDay = () => {
      const stored = localStorage.getItem(todayKey());
      if (!stored) {
        setDone({
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        });
      }
    };
    const interval = setInterval(checkDay, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fetch geolocation if available
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        saveLocation(lat, lng);
        setLocation({
          latitude: lat,
          longitude: lng,
          error: null,
          loading: false,
          requested: true,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const dateString = currentTime.toDateString();
  const dateOnly = useMemo(() => {
    return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString]);

  const prayerTimes = useMemo(() => {
    if (location.latitude === null || location.longitude === null) return null;
    const coords = new Coordinates(location.latitude, location.longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    return new PrayerTimes(coords, dateOnly, params);
  }, [location.latitude, location.longitude, dateOnly]);

  const prayerList = useMemo(() => {
    if (!prayerTimes) return [];
    return [
      { name: "fajr" as PrayerKey, time: prayerTimes.fajr },
      { name: "dhuhr" as PrayerKey, time: prayerTimes.dhuhr },
      { name: "asr" as PrayerKey, time: prayerTimes.asr },
      { name: "maghrib" as PrayerKey, time: prayerTimes.maghrib },
      { name: "isha" as PrayerKey, time: prayerTimes.isha },
    ];
  }, [prayerTimes]);

  const getPrayerKey = (prayer: typeof Prayer[keyof typeof Prayer]): PrayerKey | null => {
    switch (prayer) {
      case Prayer.Fajr: return "fajr";
      case Prayer.Dhuhr: return "dhuhr";
      case Prayer.Asr: return "asr";
      case Prayer.Maghrib: return "maghrib";
      case Prayer.Isha: return "isha";
      default: return null;
    }
  };

  const currentPrayerKey = useMemo(() => {
    if (!prayerTimes) return null;
    return getPrayerKey(prayerTimes.currentPrayer());
  }, [prayerTimes, currentTime]);

  const nextPrayerKey = useMemo(() => {
    if (!prayerTimes) return null;
    return getPrayerKey(prayerTimes.nextPrayer());
  }, [prayerTimes, currentTime]);

  const nextPrayerTime = useMemo(() => {
    if (!prayerTimes || !nextPrayerKey) return null;
    return prayerTimes.timeForPrayer(
      nextPrayerKey === "fajr" ? Prayer.Fajr :
      nextPrayerKey === "dhuhr" ? Prayer.Dhuhr :
      nextPrayerKey === "asr" ? Prayer.Asr :
      nextPrayerKey === "maghrib" ? Prayer.Maghrib :
      Prayer.Isha
    );
  }, [prayerTimes, nextPrayerKey]);

  const formatCountdown = useCallback((target: Date | null): string | null => {
    if (!target) return null;
    const diff = target.getTime() - currentTime.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [currentTime]);

  const timeUntilNextPrayer = useMemo(
    () => formatCountdown(nextPrayerTime),
    [nextPrayerTime, formatCountdown]
  );

  const headerPrayerKey: PrayerKey | null = currentPrayerKey ?? nextPrayerKey;
  const headerPrayerTime = useMemo(() => {
    if (!prayerTimes || !headerPrayerKey) return null;
    return prayerTimes.timeForPrayer(
      headerPrayerKey === "fajr" ? Prayer.Fajr :
      headerPrayerKey === "dhuhr" ? Prayer.Dhuhr :
      headerPrayerKey === "asr" ? Prayer.Asr :
      headerPrayerKey === "maghrib" ? Prayer.Maghrib :
      Prayer.Isha
    );
  }, [prayerTimes, headerPrayerKey]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        error: t("qibla.errors.notSupported"),
        loading: false,
        requested: true,
      });
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, requested: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        saveLocation(lat, lng);
        setLocation({
          latitude: lat,
          longitude: lng,
          error: null,
          loading: false,
          requested: true,
        });
      },
      (error) => {
        let errorMessage = t("qibla.errors.unableToRetrieve");
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = t("qibla.errors.permissionDenied");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = t("qibla.errors.unavailable");
        } else if (error.code === error.TIMEOUT) {
          errorMessage = t("qibla.errors.timeout");
        }
        setLocation((prev) => ({
          latitude: prev.latitude,
          longitude: prev.longitude,
          error: prev.latitude !== null ? null : errorMessage,
          loading: false,
          requested: true,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const togglePrayer = (key: PrayerKey) => {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveDoneState(next);
      return next;
    });
  };

  const markAllDone = () => {
    const allDone: Record<PrayerKey, boolean> = {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true,
    };
    setDone(allDone);
    saveDoneState(allDone);
  };

  const allMarked = PRAYER_ORDER.every((k) => done[k]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <h1 className="font-display font-bold text-xl flex items-center gap-2">
            <Moon className="w-5 h-5 text-emerald-500" />
            {t("sholatPage.title")}
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6">
        {!location.requested || location.loading ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center">
            {location.loading ? (
              <>
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("sholatPage.loading")}</h3>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <MapPin className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t("sholatPage.noLocationTitle")}</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {t("sholatPage.noLocationDesc")}
                </p>
                <Button onClick={requestLocation} size="lg" data-testid="button-enable-location">
                  <MapPin className="w-4 h-4 mr-2" />
                  {t("qibla.enableLocation")}
                </Button>
              </>
            )}
          </Card>
        ) : location.error && location.latitude === null ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center">
            <MapPin className="w-12 h-12 text-rose-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("qibla.locationRequired")}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">{location.error}</p>
            <Button onClick={requestLocation} data-testid="button-retry-location">
              {t("qibla.tryAgain")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header: two-card row */}
            <div className="grid grid-cols-3 gap-3">
              <Card
                className="col-span-2 p-5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-700"
                data-testid="card-current-prayer"
              >
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">
                  {currentPrayerKey ? t("sholatPage.currentPrayer") : t("sholatPage.nextPrayer")}
                </div>
                <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                  <div
                    className="text-2xl md:text-3xl font-bold"
                    data-testid="text-current-prayer-name"
                  >
                    {headerPrayerKey ? t(`qibla.prayers.${headerPrayerKey}`) : "--"}
                  </div>
                  <div
                    className="text-xl md:text-2xl font-mono text-emerald-100"
                    data-testid="text-current-prayer-time"
                  >
                    {headerPrayerTime ? format(headerPrayerTime, "HH:mm") : "--:--"}
                  </div>
                </div>
                {nextPrayerKey && timeUntilNextPrayer && (
                  <div
                    className="mt-3 text-sm text-emerald-50/90"
                    data-testid="text-next-prayer"
                  >
                    {t("sholatPage.nextPrayer")}: {t(`qibla.prayers.${nextPrayerKey}`)} {t("sholatPage.in")}{" "}
                    <span className="font-semibold">{timeUntilNextPrayer}</span>
                  </div>
                )}
              </Card>

              <button
                type="button"
                onClick={() => navigate("/qibla")}
                className="text-left"
                data-testid="button-open-qibla"
              >
                <Card className="p-5 h-full flex flex-col items-center justify-center text-center hover-elevate active-elevate-2 cursor-pointer">
                  <Compass className="w-8 h-8 text-emerald-500 mb-2" />
                  <div className="text-sm font-semibold">{t("sholatPage.qiblaFinder")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    {t("sholatPage.qiblaFinderDesc")}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-2" />
                </Card>
              </button>
            </div>

            {/* Prayer list */}
            <Card className="p-2 sm:p-3">
              <div className="divide-y divide-border">
                {prayerList.map((prayer) => {
                  const isCurrent = currentPrayerKey === prayer.name;
                  const isNext = !isCurrent && nextPrayerKey === prayer.name;
                  const isDone = done[prayer.name];
                  const Icon = PRAYER_ICONS[prayer.name];
                  return (
                    <div
                      key={prayer.name}
                      className={`flex items-center gap-3 p-3 sm:p-4 rounded-lg ${
                        isCurrent ? "bg-emerald-500/10" : ""
                      }`}
                      data-testid={`prayer-row-${prayer.name}`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePrayer(prayer.name)}
                        aria-label={`${t(`qibla.prayers.${prayer.name}`)} - ${t("sholatPage.doneLabel")}`}
                        aria-pressed={isDone}
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-muted-foreground/40 text-transparent hover:border-emerald-500/60"
                        }`}
                        data-testid={`button-toggle-${prayer.name}`}
                      >
                        <Check className="w-5 h-5" />
                      </button>

                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isCurrent ? "text-emerald-500" : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`font-medium truncate ${
                            isDone ? "line-through text-muted-foreground" : ""
                          } ${isCurrent ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                          data-testid={`text-prayer-name-${prayer.name}`}
                        >
                          {t(`qibla.prayers.${prayer.name}`)}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] sm:text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                            {t("qibla.now")}
                          </span>
                        )}
                        {isNext && timeUntilNextPrayer && (
                          <span className="text-[10px] sm:text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                            {t("sholatPage.in")} {timeUntilNextPrayer}
                          </span>
                        )}
                      </div>

                      <span
                        className={`font-mono text-sm sm:text-base shrink-0 ${
                          isCurrent
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : isDone
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                        data-testid={`text-prayer-time-${prayer.name}`}
                      >
                        {format(prayer.time, "HH:mm")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Button
              onClick={markAllDone}
              disabled={allMarked}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
              data-testid="button-mark-all-done"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {allMarked ? t("sholatPage.allDone") : t("sholatPage.markAllDone")}
            </Button>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
