import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Coordinates, PrayerTimes, CalculationMethod, Prayer, SunnahTimes } from "adhan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PrayerListCard } from "@/components/shared/PrayerListCard";
import {
  Compass,
  MapPin,
  Loader2,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { usePrayerCompletion } from "@/hooks/use-prayer-completions";
import {
  getSavedLocation,
  saveLocation as saveSharedLocation,
  reverseGeocode,
  formatCoords,
} from "@/lib/location";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  requested: boolean;
}

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
// Re-export of the same union from PrayerListCard kept local for ergonomics.

function saveLocation(latitude: number, longitude: number, placeName?: string | null) {
  saveSharedLocation(latitude, longitude, placeName);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function SholatPage() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();

  const saved = getSavedLocation();
  const [location, setLocation] = useState<LocationState>({
    latitude: saved?.latitude ?? null,
    longitude: saved?.longitude ?? null,
    error: null,
    loading: false,
    requested: saved !== null,
  });
  const [placeName, setPlaceName] = useState<string | null>(saved?.placeName ?? null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // selectedDate is always midnight of the chosen day
  const [selectedDate, setSelectedDate] = useState<Date>(() => toMidnight(new Date()));

  const dateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);

  const todayMidnight = useMemo(
    () => toMidnight(currentTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()],
  );

  const isToday = useMemo(
    () => selectedDate.getTime() === todayMidnight.getTime(),
    [selectedDate, todayMidnight],
  );

  const { flags: done, togglePrayer: togglePrayerMutation, markAll } = usePrayerCompletion(dateKey);

  const [wigglingPrayer, setWigglingPrayer] = useState<PrayerKey | null>(null);
  const wiggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFutureDay = useMemo(
    () => selectedDate.getTime() > todayMidnight.getTime(),
    [selectedDate, todayMidnight],
  );

  const isPastDay = useMemo(
    () => selectedDate.getTime() < todayMidnight.getTime(),
    [selectedDate, todayMidnight],
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-fetch geolocation if available
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const prev = getSavedLocation();
        const movedFar =
          !prev ||
          Math.abs(prev.latitude - lat) > 0.05 ||
          Math.abs(prev.longitude - lng) > 0.05;
        if (movedFar) setPlaceName(null);
        saveLocation(lat, lng, movedFar ? null : prev?.placeName ?? null);
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

  // Reverse geocode to display a friendly place name; falls back to coords on failure.
  useEffect(() => {
    if (location.latitude === null || location.longitude === null) return;
    if (placeName) return;
    const controller = new AbortController();
    const lat = location.latitude;
    const lng = location.longitude;
    setPlaceLoading(true);
    reverseGeocode(lat, lng, i18n.language || "en", controller.signal)
      .then((name) => {
        if (controller.signal.aborted) return;
        if (name) {
          setPlaceName(name);
          saveLocation(lat, lng, name);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setPlaceLoading(false);
      });
    return () => controller.abort();
  }, [location.latitude, location.longitude, placeName, i18n.language]);

  // Keep selectedDate in sync when the calendar day rolls over while on today
  useEffect(() => {
    setSelectedDate((prev) => {
      // Only auto-advance if the user is on today; don't disturb manual navigation
      if (prev.getTime() === toMidnight(new Date(currentTime.getTime() - 1000)).getTime()) {
        return todayMidnight;
      }
      return prev;
    });
  }, [todayMidnight, currentTime]);

  const prayerTimes = useMemo(() => {
    if (location.latitude === null || location.longitude === null) return null;
    const coords = new Coordinates(location.latitude, location.longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    return new PrayerTimes(coords, selectedDate, params);
  }, [location.latitude, location.longitude, selectedDate]);

  const isPrayerLocked = useCallback(
    (prayerTime: Date): boolean => {
      if (isFutureDay) return true;
      if (isPastDay) return false;
      if (!prayerTimes) return false;
      return prayerTime > currentTime;
    },
    [isFutureDay, isPastDay, prayerTimes, currentTime],
  );

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

  const imsakTime = useMemo(() => {
    if (!prayerTimes) return null;
    return new Date(prayerTimes.fajr.getTime() - 10 * 60 * 1000);
  }, [prayerTimes]);

  const sunriseTime = useMemo(() => {
    if (!prayerTimes) return null;
    return prayerTimes.sunrise;
  }, [prayerTimes]);

  const nextDayPrayerTimes = useMemo(() => {
    if (location.latitude === null || location.longitude === null) return null;
    const coords = new Coordinates(location.latitude, location.longitude);
    const params = CalculationMethod.MuslimWorldLeague();
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return new PrayerTimes(coords, nextDay, params);
  }, [location.latitude, location.longitude, selectedDate]);

  const dhuhaWindow = useMemo(() => {
    if (!prayerTimes) return null;
    const start = new Date(prayerTimes.sunrise.getTime() + 15 * 60 * 1000);
    const end = new Date(prayerTimes.dhuhr.getTime() - 2 * 60 * 1000);
    return { start, end };
  }, [prayerTimes]);

  const tahajjudWindow = useMemo(() => {
    if (!prayerTimes || !nextDayPrayerTimes) return null;
    const sunnah = new SunnahTimes(prayerTimes);
    return { start: sunnah.lastThirdOfTheNight, end: nextDayPrayerTimes.fajr };
  }, [prayerTimes, nextDayPrayerTimes]);

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

  // currentPrayer and nextPrayer are only meaningful when viewing today
  const currentPrayerKey = useMemo(() => {
    if (!prayerTimes || !isToday) return null;
    return getPrayerKey(prayerTimes.currentPrayer());
  }, [prayerTimes, currentTime, isToday]);

  const nextPrayerKey = useMemo(() => {
    if (!prayerTimes || !isToday) return null;
    return getPrayerKey(prayerTimes.nextPrayer());
  }, [prayerTimes, currentTime, isToday]);

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
    if (hours > 0) return `${hours}j ${minutes}m`;
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

  const goToPrevDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

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
        const prevSaved = getSavedLocation();
        const movedFar =
          !prevSaved ||
          Math.abs(prevSaved.latitude - lat) > 0.05 ||
          Math.abs(prevSaved.longitude - lng) > 0.05;
        if (movedFar) setPlaceName(null);
        saveLocation(lat, lng, movedFar ? null : prevSaved?.placeName ?? null);
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

  const triggerWiggle = useCallback((key: PrayerKey) => {
    if (wiggleTimerRef.current) clearTimeout(wiggleTimerRef.current);
    setWigglingPrayer(key);
    wiggleTimerRef.current = setTimeout(() => {
      setWigglingPrayer(null);
      wiggleTimerRef.current = null;
    }, 450);
  }, []);

  useEffect(() => {
    return () => {
      if (wiggleTimerRef.current) clearTimeout(wiggleTimerRef.current);
    };
  }, []);

  const togglePrayer = useCallback((key: PrayerKey, prayerTime: Date) => {
    if (isPrayerLocked(prayerTime)) {
      triggerWiggle(key);
      return;
    }
    togglePrayerMutation(key);
  }, [isPrayerLocked, triggerWiggle, togglePrayerMutation]);

  const markablePrayers = useMemo(() => {
    return prayerList.filter((p) => !isPrayerLocked(p.time));
  }, [prayerList, isPrayerLocked]);

  const allMarkableDone = useMemo(() => {
    if (markablePrayers.length === 0) return true;
    return markablePrayers.every((p) => done[p.name]);
  }, [markablePrayers, done]);

  const markAllDone = () => {
    if (isPastDay) {
      markAll();
    } else {
      markablePrayers.forEach((p) => {
        if (!done[p.name]) togglePrayerMutation(p.name);
      });
    }
  };

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
            {/* Day navigation bar */}
            <div className="flex items-center justify-between gap-2" data-testid="row-day-navigation">
              <button
                type="button"
                onClick={goToPrevDay}
                aria-label="Previous day"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                data-testid="button-prev-day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 text-center" data-testid="text-selected-date">
                <div className="font-semibold text-base leading-tight">
                  {isToday
                    ? t("sholatPage.today", { defaultValue: "Today" })
                    : format(selectedDate, "EEEE")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(selectedDate, "d MMMM yyyy")}
                </div>
              </div>

              <button
                type="button"
                onClick={goToNextDay}
                aria-label="Next day"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                data-testid="button-next-day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {location.latitude !== null && location.longitude !== null && (
              <div
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
                data-testid="text-your-location"
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {placeName ? (
                  <span>{placeName}</span>
                ) : placeLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("qibla.locatingPlace")}
                  </span>
                ) : (
                  <span className="font-mono">
                    {formatCoords(location.latitude, location.longitude)}
                  </span>
                )}
              </div>
            )}

            {/* Header: two-card row */}
            <div className="grid grid-cols-3 gap-3">
              <Card
                className="col-span-2 p-5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-700"
                data-testid="card-current-prayer"
              >
                <div className="text-xs uppercase tracking-wide text-emerald-100/80">
                  {isToday
                    ? (currentPrayerKey ? t("sholatPage.currentPrayer") : t("sholatPage.nextPrayer"))
                    : t("sholatPage.prayerTimes", { defaultValue: "Prayer Times" })}
                </div>
                <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                  <div
                    className="text-2xl md:text-3xl font-bold"
                    data-testid="text-current-prayer-name"
                  >
                    {isToday
                      ? (headerPrayerKey ? t(`qibla.prayers.${headerPrayerKey}`) : "--")
                      : format(selectedDate, "d MMM")}
                  </div>
                  {isToday && (
                    <div
                      className="text-xl md:text-2xl font-mono text-emerald-100"
                      data-testid="text-current-prayer-time"
                    >
                      {headerPrayerTime ? format(headerPrayerTime, "HH:mm") : "--:--"}
                    </div>
                  )}
                </div>
                {isToday && nextPrayerKey && timeUntilNextPrayer && (
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

            {/* Sub-times: Imsak / Sunrise / Dhuha / Tahajjud */}
            {(imsakTime || sunriseTime || dhuhaWindow || tahajjudWindow) && (
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-xs text-muted-foreground px-2"
                data-testid="row-sub-times"
              >
                {imsakTime && (
                  <span
                    className="flex items-center justify-center gap-1.5"
                    data-testid="text-imsak"
                  >
                    <Moon className="w-3 h-3 shrink-0" />
                    <span>{t("sholatPage.imsak")}</span>
                    <span className="font-mono">{format(imsakTime, "HH:mm")}</span>
                  </span>
                )}
                {sunriseTime && (
                  <span
                    className="flex items-center justify-center gap-1.5"
                    data-testid="text-sunrise"
                  >
                    <Sunrise className="w-3 h-3 shrink-0" />
                    <span>{t("sholatPage.sunrise")}</span>
                    <span className="font-mono">{format(sunriseTime, "HH:mm")}</span>
                  </span>
                )}
                {dhuhaWindow && (
                  <span
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap"
                    data-testid="text-dhuha-window"
                  >
                    <Sun className="w-3 h-3 shrink-0" />
                    <span>{t("sholatPage.dhuha")}</span>
                    <span className="font-mono">
                      {format(dhuhaWindow.start, "HH:mm")}–{format(dhuhaWindow.end, "HH:mm")}
                    </span>
                  </span>
                )}
                {tahajjudWindow && (
                  <span
                    className="flex items-center justify-center gap-1.5 whitespace-nowrap"
                    data-testid="text-tahajjud-window"
                  >
                    <Moon className="w-3 h-3 shrink-0" />
                    <span>{t("sholatPage.tahajjud")}</span>
                    <span className="font-mono">
                      {format(tahajjudWindow.start, "HH:mm")}–{format(tahajjudWindow.end, "HH:mm")}
                    </span>
                  </span>
                )}
              </div>
            )}

            {/* Prayer list — shared <PrayerListCard /> used by ProductTour too. */}
            <PrayerListCard
              prayers={prayerList.map((prayer) => {
                const isCurrent = isToday && currentPrayerKey === prayer.name;
                const isNext = isToday && !isCurrent && nextPrayerKey === prayer.name;
                return {
                  name: prayer.name,
                  time: prayer.time,
                  isCurrent,
                  isNext,
                  isDone: done[prayer.name],
                  locked: isPrayerLocked(prayer.time),
                  isWiggling: wigglingPrayer === prayer.name,
                };
              })}
              prayerLabel={(key) => t(`qibla.prayers.${key}`)}
              doneAriaLabel={t("sholatPage.doneLabel")}
              nowLabel={t("qibla.now")}
              nextLabel={timeUntilNextPrayer ? `${t("sholatPage.in")} ${timeUntilNextPrayer}` : undefined}
              onTogglePrayer={togglePrayer}
            />

            {!isFutureDay && (
              <Button
                onClick={markAllDone}
                disabled={allMarkableDone}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                size="lg"
                data-testid="button-mark-all-done"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                {allMarkableDone ? t("sholatPage.allDone") : t("sholatPage.markAllDone")}
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
