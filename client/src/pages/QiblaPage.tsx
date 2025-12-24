import { useState, useEffect } from "react";
import { Coordinates, Qibla } from "adhan";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Compass, MapPin, Loader2, Navigation } from "lucide-react";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export default function QiblaPage() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please enable it in your browser settings.";
          setPermissionDenied(true);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out.";
        }
        setLocation({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
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

    if (typeof DeviceOrientationEvent !== "undefined") {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        (DeviceOrientationEvent as any)
          .requestPermission()
          .then((permissionState: string) => {
            if (permissionState === "granted") {
              window.addEventListener("deviceorientation", handleOrientation, true);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener("deviceorientationabsolute", handleOrientation as any, true);
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    }

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as any, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

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

  const requestLocationPermission = () => {
    setLocation({ ...location, loading: true, error: null });
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setLocation({
          latitude: null,
          longitude: null,
          error: "Location permission denied",
          loading: false,
        });
        setPermissionDenied(true);
      }
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background text-foreground pb-20">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-xl flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-500" />
              Qibla Compass
            </h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="container max-w-5xl mx-auto px-4 py-8">
          {location.loading ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium mb-2">Getting your location...</h3>
              <p className="text-muted-foreground">
                Please allow location access to find Qibla direction.
              </p>
            </Card>
          ) : location.error ? (
            <Card className="p-12 text-center flex flex-col items-center justify-center">
              <MapPin className="w-12 h-12 text-rose-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Location Required</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {location.error}
              </p>
              {permissionDenied && (
                <Button onClick={requestLocationPermission} data-testid="button-retry-location">
                  Try Again
                </Button>
              )}
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
                        <Navigation className="w-4 h-4 text-white fill-white" />
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
                </div>

                <div className="mt-6 text-center">
                  <p className="text-lg font-medium">
                    Qibla Direction: <span className="text-emerald-500">{qiblaDirection !== null ? `${Math.round(qiblaDirection)}° from North` : "Calculating..."}</span>
                  </p>
                  {compassHeading === null && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Rotate your device to enable compass (mobile only)
                    </p>
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="text-muted-foreground text-sm mb-2">Distance to Kaaba</div>
                  <div className="text-2xl font-bold text-foreground">
                    {distanceToKaaba !== null
                      ? distanceToKaaba > 1000
                        ? `${(distanceToKaaba / 1000).toFixed(0)}k km`
                        : `${Math.round(distanceToKaaba)} km`
                      : "--"}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-muted-foreground text-sm mb-2">Your Location</div>
                  <div className="text-sm font-medium text-foreground">
                    {location.latitude !== null && location.longitude !== null
                      ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`
                      : "--"}
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-medium mb-2">How to use</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">1.</span>
                    Hold your device flat and level
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">2.</span>
                    The green arrow points toward the Kaaba in Mecca
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">3.</span>
                    Turn your body until facing the arrow direction
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
