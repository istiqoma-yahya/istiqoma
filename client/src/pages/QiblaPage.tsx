import { useState, useEffect, useMemo } from "react";
import { Coordinates, Qibla, PrayerTimes, CalculationMethod, Prayer } from "adhan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Compass, MapPin, Loader2, ArrowUp, Clock, Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  getSavedLocation,
  saveLocation,
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

export default function QiblaPage() {
  const { t, i18n } = useTranslation();

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
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation((prev) => {
          const movedFar =
            prev.latitude === null ||
            prev.longitude === null ||
            Math.abs(prev.latitude - lat) > 0.05 ||
            Math.abs(prev.longitude - lng) > 0.05;
          if (movedFar) {
            setPlaceName(null);
          }
          saveLocation(lat, lng, movedFar ? null : saved?.placeName ?? null);
          return {
            latitude: lat,
            longitude: lng,
            error: null,
            loading: false,
            requested: true,
          };
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (location.latitude === null || location.longitude === null) return;
    if (placeName) return;
    const controller = new AbortController();
    setPlaceLoading(true);
    reverseGeocode(location.latitude, location.longitude, i18n.language || "en", controller.signal)
      .then((name) => {
        if (controller.signal.aborted) return;
        if (name) {
          setPlaceName(name);
          if (location.latitude !== null && location.longitude !== null) {
            saveLocation(location.latitude, location.longitude, name);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setPlaceLoading(false);
      });
    return () => controller.abort();
  }, [location.latitude, location.longitude, placeName, i18n.language]);

  const dateString = currentTime.toDateString();
  const dateOnly = useMemo(() => {
    return new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
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
      { name: "fajr", time: prayerTimes.fajr, icon: Sunrise },
      { name: "dhuhr", time: prayerTimes.dhuhr, icon: Sun },
      { name: "asr", time: prayerTimes.asr, icon: Sun },
      { name: "maghrib", time: prayerTimes.maghrib, icon: Sunset },
      { name: "isha", time: prayerTimes.isha, icon: Moon },
    ];
  }, [prayerTimes]);

  const currentPrayer = useMemo(() => {
    if (!prayerTimes) return null;
    return prayerTimes.currentPrayer();
  }, [prayerTimes, currentTime]);

  const nextPrayer = useMemo(() => {
    if (!prayerTimes) return null;
    return prayerTimes.nextPrayer();
  }, [prayerTimes, currentTime]);

  const timeUntilNextPrayer = useMemo(() => {
    if (!prayerTimes || !nextPrayer || nextPrayer === Prayer.None) return null;
    const nextTime = prayerTimes.timeForPrayer(nextPrayer);
    if (!nextTime) return null;
    const diff = nextTime.getTime() - currentTime.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}j ${minutes}m`;
    return `${minutes}m`;
  }, [prayerTimes, nextPrayer, currentTime]);

  const getPrayerKey = (prayer: typeof Prayer[keyof typeof Prayer]): string => {
    switch (prayer) {
      case Prayer.Fajr: return "fajr";
      case Prayer.Dhuhr: return "dhuhr";
      case Prayer.Asr: return "asr";
      case Prayer.Maghrib: return "maghrib";
      case Prayer.Isha: return "isha";
      default: return "";
    }
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

    setLocation(prev => ({ ...prev, loading: true, requested: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPlaceName(null);
        saveLocation(lat, lng, null);
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
          setPermissionDenied(true);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = t("qibla.errors.unavailable");
        } else if (error.code === error.TIMEOUT) {
          errorMessage = t("qibla.errors.timeout");
        }
        setLocation(prev => ({
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

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let heading: number | null = null;
    
    if ("webkitCompassHeading" in event) {
      heading = (event as any).webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = event.absolute ? event.alpha : 360 - event.alpha;
    }
    
    if (heading !== null) {
      setCompassHeading(heading);
    }
  };

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;

    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      // iOS: try calling requestPermission() without a user gesture.
      // If permission was already granted in this session, iOS returns "granted"
      // immediately with no dialog. If a fresh session requires a gesture it throws.
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((state: string) => {
          if (state === "granted") {
            localStorage.setItem("compass-permission-granted", "true");
            window.addEventListener("deviceorientation", handleOrientation, true);
            setCompassEnabled(true);
            setNeedsTap(false);
          } else {
            setNeedsTap(true);
          }
        })
        .catch(() => {
          // Gesture required — show tap-to-activate overlay on the compass circle.
          setNeedsTap(true);
        });
    } else {
      // Android / desktop — no permission needed, auto-enable.
      window.addEventListener("deviceorientationabsolute", handleOrientation as any, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
      setCompassEnabled(true);
    }

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as any, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  const enableCompass = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === "granted") {
          localStorage.setItem("compass-permission-granted", "true");
          window.addEventListener("deviceorientation", handleOrientation, true);
          setCompassEnabled(true);
          setNeedsTap(false);
        }
      } catch (error) {
        console.error("Compass permission error:", error);
      }
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let qiblaDirection: number | null = null;
  let distanceToKaaba: number | null = null;

  if (location.latitude !== null && location.longitude !== null) {
    const coords = new Coordinates(location.latitude, location.longitude);
    qiblaDirection = Qibla(coords);
    distanceToKaaba = calculateDistance(
      location.latitude,
      location.longitude,
      KAABA_COORDS.lat,
      KAABA_COORDS.lng
    );
  }

  const compassRotation = compassHeading !== null && qiblaDirection !== null
    ? qiblaDirection - compassHeading
    : qiblaDirection;

  
  return (
    <>
      <div className="min-h-screen bg-background text-foreground pb-20">
        <header className="sticky top-0 z-50 border-b border-border app-header bg-background/80 backdrop-blur-md">
          <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-500" />
              {t("qibla.title")}
            </h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="container max-w-5xl mx-auto px-4 py-8">
          {!location.requested ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                <Compass className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t("qibla.findQibla")}</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {t("qibla.locationDesc")}
              </p>
              <Button onClick={requestLocation} size="lg" data-testid="button-enable-location">
                <MapPin className="w-4 h-4 mr-2" />
                {t("qibla.enableLocation")}
              </Button>
            </Card>
          ) : location.loading ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("qibla.gettingLocation")}</h3>
              <p className="text-muted-foreground">
                {t("qibla.allowLocation")}
              </p>
            </Card>
          ) : location.error ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <MapPin className="w-12 h-12 text-rose-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("qibla.locationRequired")}</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {location.error}
              </p>
              <Button onClick={requestLocation} data-testid="button-retry-location">
                {t("qibla.tryAgain")}
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card className="p-8 flex flex-col items-center justify-center">
                <div className="relative w-72 h-72 md:w-80 md:h-80">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-border bg-gradient-to-b from-muted/50 to-muted transition-transform duration-300 ease-out"
                    style={{
                      transform: compassHeading !== null ? `rotate(${-compassHeading}deg)` : "none",
                    }}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground">N</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground">S</div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">W</div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">E</div>

                    {[...Array(36)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-0.5 bg-border"
                        style={{
                          height: i % 3 === 0 ? "12px" : "6px",
                          left: "50%",
                          top: "0",
                          transformOrigin: "50% 144px",
                          transform: `translateX(-50%) rotate(${i * 10}deg)`,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className="absolute inset-4 flex items-center justify-center transition-transform duration-300 ease-out"
                    style={{
                      transform: `rotate(${compassRotation || 0}deg)`,
                    }}
                  >
                    <div className="absolute w-1 h-24 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-full -top-2 left-1/2 -translate-x-1/2" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <ArrowUp className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-background border-2 border-emerald-500/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-emerald-500">
                        {qiblaDirection !== null ? `${Math.round(qiblaDirection)}°` : "--"}
                      </span>
                    </div>
                  </div>

                  {needsTap && (
                    <button
                      type="button"
                      className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/40 touch-manipulation cursor-pointer z-10"
                      onClick={enableCompass}
                      data-testid="button-enable-compass"
                    >
                      <div className="animate-ping absolute w-16 h-16 rounded-full bg-emerald-500/30" />
                      <Compass className="w-8 h-8 text-emerald-400 relative z-10 mb-1" />
                      <span className="text-xs font-medium text-white relative z-10 text-center px-4">
                        {t("qibla.tapToActivate")}
                      </span>
                    </button>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-lg font-medium">
                    {t("qibla.qiblaDirection")}: <span className="text-emerald-500">{qiblaDirection !== null ? `${Math.round(qiblaDirection)}°` : "--"}</span>
                  </p>
                  {compassHeading === null && !needsTap && compassEnabled && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("qibla.rotateDevice")}
                    </p>
                  )}
                  {compassEnabled && compassHeading !== null && (
                    <p className="text-sm text-emerald-500 mt-2">
                      {t("qibla.compassActive")}
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    {t("qibla.prayerTimes")}
                  </h3>
                  {nextPrayer !== null && nextPrayer !== Prayer.None && timeUntilNextPrayer && (
                    <span className="text-xs text-muted-foreground">
                      {t("qibla.nextIn")} <span className="text-emerald-500 font-medium">{timeUntilNextPrayer}</span>
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {prayerList.map((prayer) => {
                    const isCurrent = currentPrayer !== null && getPrayerKey(currentPrayer) === prayer.name;
                    const isNext = nextPrayer !== null && getPrayerKey(nextPrayer) === prayer.name;
                    const IconComponent = prayer.icon;
                    return (
                      <div
                        key={prayer.name}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isCurrent
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : isNext
                            ? "bg-muted/50"
                            : ""
                        }`}
                        data-testid={`prayer-time-${prayer.name}`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${isCurrent ? "text-emerald-500" : "text-muted-foreground"}`} />
                          <span className={`font-medium ${isCurrent ? "text-emerald-500" : ""}`}>
                            {t(`qibla.prayers.${prayer.name}`)}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                              {t("qibla.now")}
                            </span>
                          )}
                          {isNext && !isCurrent && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {t("qibla.next")}
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-sm ${isCurrent ? "text-emerald-500 font-bold" : "text-muted-foreground"}`}>
                          {format(prayer.time, "HH:mm")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="text-muted-foreground text-sm mb-2">{t("qibla.distanceToKaaba")}</div>
                  <div className="text-2xl font-bold text-foreground" data-testid="text-distance-kaaba">
                    {distanceToKaaba !== null
                      ? `${new Intl.NumberFormat(i18n.language || "en").format(
                          Math.round(distanceToKaaba)
                        )} km`
                      : "--"}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-muted-foreground text-sm mb-2">{t("qibla.yourLocation")}</div>
                  <div className="text-sm font-medium text-foreground" data-testid="text-your-location">
                    {location.latitude === null || location.longitude === null ? (
                      "--"
                    ) : placeName ? (
                      placeName
                    ) : placeLoading ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t("qibla.locatingPlace")}
                      </span>
                    ) : (
                      formatCoords(location.latitude, location.longitude)
                    )}
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-medium mb-2">{t("qibla.howToUse")}</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">1.</span>
                    {t("qibla.step1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">2.</span>
                    {t("qibla.step2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">3.</span>
                    {t("qibla.step3")}
                  </li>
                </ul>
              </Card>
            </div>
          )}
        </main>

        <BottomNavigation />
      </div>
    </>
  );
}
