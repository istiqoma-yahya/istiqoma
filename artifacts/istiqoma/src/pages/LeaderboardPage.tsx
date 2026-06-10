import { useEffect, useMemo, useRef, useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDown, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { getLeaderboardDisplayName, getLeaderboardInitials } from "@/lib/leaderboard";

type Period = "daily" | "monthly" | "yearly";

type Entry = {
  rank: number;
  userId: string;
  username: string | null;
  email: string | null;
  profileImageUrl: string | null;
  points: number;
  isCurrentUser: boolean;
};

type LeaderboardResponse = {
  entries: Entry[];
  me: { rank: number; points: number } | null;
  total: number;
};

function getBrowserTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// Page-level state per period. Stored locally (not in tanstack-query) so
// scroll up/down can mutate the entry list without remounting.
type PeriodState = {
  entries: Entry[];
  me: { rank: number; points: number } | null;
  total: number;
  hasAbove: boolean;
  hasBelow: boolean;
  loadingAbove: boolean;
  loadingBelow: boolean;
};

const initialState: PeriodState = {
  entries: [],
  me: null,
  total: 0,
  hasAbove: false,
  hasBelow: false,
  loadingAbove: false,
  loadingBelow: false,
};

export default function LeaderboardPage() {
  const { t, i18n } = useTranslation();
  usePageMeta({
    title: t("seo.leaderboard.title"),
    description: t("seo.leaderboard.description"),
    locale: i18n.language?.split("-")[0] ?? "en",
    canonicalPath: "/leaderboard",
  });
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("daily");
  const tz = useMemo(getBrowserTimezone, []);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/leaderboard", period, tz ?? "auto"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);
      if (tz) params.set("timezone", tz);
      const res = await apiRequest("GET", `/api/leaderboard?${params.toString()}`);
      return res.json();
    },
  });

  // Local mutable view of the list so scroll-up / scroll-down can
  // prepend/append entries to the same window without losing scroll
  // position via remounts.
  const [state, setState] = useState<PeriodState>(initialState);

  // Reset whenever period changes or the query refetches.
  useEffect(() => {
    if (!data) return;
    const ranks = data.entries.map((e) => e.rank);
    const minRank = ranks.length ? Math.min(...ranks) : null;
    const maxRank = ranks.length ? Math.max(...ranks) : null;
    setState({
      entries: data.entries,
      me: data.me,
      total: data.total,
      hasAbove: minRank !== null && minRank > 1,
      hasBelow: maxRank !== null && maxRank < data.total,
      loadingAbove: false,
      loadingBelow: false,
    });
  }, [data, period]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const meRowRef = useRef<HTMLDivElement | null>(null);
  const [meVisible, setMeVisible] = useState(true);

  // Center the current user's row on initial load.
  useEffect(() => {
    if (!state.entries.length) return;
    const el = meRowRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "auto" });
      });
    }
  }, [period, state.entries.length > 0]);

  // Track whether the "you" row is in view to show/hide the back-to-me FAB.
  useEffect(() => {
    const el = meRowRef.current;
    if (!el) {
      setMeVisible(state.me === null);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => setMeVisible(entries[0]?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [state.entries.length, state.me]);

  const loadAbove = async () => {
    if (state.loadingAbove || !state.hasAbove) return;
    const minRank = state.entries[0]?.rank;
    if (!minRank) return;
    setState((s) => ({ ...s, loadingAbove: true }));
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("beforeRank", String(minRank));
      params.set("limit", "50");
      if (tz) params.set("timezone", tz);
      const res = await apiRequest("GET", `/api/leaderboard?${params.toString()}`);
      const json = (await res.json()) as LeaderboardResponse;
      const before = listRef.current?.scrollHeight ?? 0;
      setState((s) => {
        const merged = [...json.entries, ...s.entries].filter(
          (e, i, a) => a.findIndex((x) => x.userId === e.userId) === i,
        );
        merged.sort((a, b) => a.rank - b.rank);
        const newMin = merged[0]?.rank ?? minRank;
        return {
          ...s,
          entries: merged,
          hasAbove: newMin > 1 && json.entries.length > 0,
          loadingAbove: false,
        };
      });
      // Restore scroll so the user stays anchored after prepending.
      requestAnimationFrame(() => {
        const after = listRef.current?.scrollHeight ?? 0;
        if (listRef.current) {
          listRef.current.scrollTop += after - before;
        }
      });
    } catch {
      setState((s) => ({ ...s, loadingAbove: false }));
    }
  };

  const loadBelow = async () => {
    if (state.loadingBelow || !state.hasBelow) return;
    const maxRank = state.entries[state.entries.length - 1]?.rank;
    if (!maxRank) return;
    setState((s) => ({ ...s, loadingBelow: true }));
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("afterRank", String(maxRank));
      params.set("limit", "50");
      if (tz) params.set("timezone", tz);
      const res = await apiRequest("GET", `/api/leaderboard?${params.toString()}`);
      const json = (await res.json()) as LeaderboardResponse;
      setState((s) => {
        const merged = [...s.entries, ...json.entries].filter(
          (e, i, a) => a.findIndex((x) => x.userId === e.userId) === i,
        );
        merged.sort((a, b) => a.rank - b.rank);
        const newMax = merged[merged.length - 1]?.rank ?? maxRank;
        return {
          ...s,
          entries: merged,
          hasBelow: newMax < s.total && json.entries.length > 0,
          loadingBelow: false,
        };
      });
    } catch {
      setState((s) => ({ ...s, loadingBelow: false }));
    }
  };

  // Edge-detect scroll near top/bottom and trigger paging.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = () => {
      const top = el.scrollTop;
      const bottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (top < 200) loadAbove();
      if (bottom < 200) loadBelow();
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [state.entries, state.hasAbove, state.hasBelow, state.loadingAbove, state.loadingBelow]);

  const scrollToMe = () => {
    meRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const handleTabChange = (next: string) => {
    if (next === period) return;
    setPeriod(next as Period);
    setState(initialState);
    queryClient.invalidateQueries({ queryKey: ["/api/leaderboard", next] });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="page-leaderboard">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-3 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-back"
            aria-label={t("common.back", { defaultValue: "Back" })}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2" data-testid="text-leaderboard-title">
            <Trophy className="w-5 h-5 text-amber-500" />
            {t("leaderboard.title")}
          </h1>
        </div>
        <div className="px-4 pb-3">
          <Tabs value={period} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily" data-testid="tab-daily">
                {t("leaderboard.daily")}
              </TabsTrigger>
              <TabsTrigger value="monthly" data-testid="tab-monthly">
                {t("leaderboard.monthly")}
              </TabsTrigger>
              <TabsTrigger value="yearly" data-testid="tab-yearly">
                {t("leaderboard.yearly")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center h-full py-12 gap-2 text-muted-foreground"
            data-testid="status-loading"
          >
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">{t("leaderboard.loading")}</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-muted-foreground">
            <p className="text-sm">{t("leaderboard.error")}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" data-testid="button-retry">
              {t("leaderboard.retry")}
            </Button>
          </div>
        ) : state.entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full py-12 gap-2 text-muted-foreground"
            data-testid="status-empty"
          >
            <Trophy className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-center px-6">{t("leaderboard.emptyState")}</p>
          </div>
        ) : (
          <div
            ref={listRef}
            className="absolute inset-0 overflow-y-auto px-4 py-3"
            data-testid="list-leaderboard"
          >
            {state.loadingAbove ? (
              <div className="flex justify-center py-3" data-testid="status-loading-above">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            <ul className="space-y-2">
              {state.entries.map((entry) => {
                const name = getLeaderboardDisplayName(entry, t("leaderboard.anonymous"));
                const initials = getLeaderboardInitials(name);
                const isMe = entry.isCurrentUser;
                return (
                  <li key={entry.userId}>
                    <div
                      ref={isMe ? meRowRef : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 bg-card",
                        isMe && "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30",
                      )}
                      data-testid={`row-leaderboard-${entry.userId}`}
                    >
                      <div
                        className={cn(
                          "w-10 text-center font-semibold tabular-nums",
                          entry.rank === 1 && "text-amber-500",
                          entry.rank === 2 && "text-slate-400",
                          entry.rank === 3 && "text-amber-700",
                        )}
                        data-testid={`text-rank-${entry.userId}`}
                      >
                        {entry.rank}
                      </div>
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        {entry.profileImageUrl ? (
                          <AvatarImage src={entry.profileImageUrl} alt={name} />
                        ) : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          data-testid={`text-name-${entry.userId}`}
                        >
                          {name}
                          {isMe ? (
                            <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                              {t("leaderboard.you")}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-semibold tabular-nums"
                          data-testid={`text-points-${entry.userId}`}
                        >
                          {isMe ? formatNumber(entry.points) : "•••"}
                        </p>
                        <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                          {isMe ? t("leaderboard.points") : ""}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {state.loadingBelow ? (
              <div className="flex justify-center py-3" data-testid="status-loading-below">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {!state.hasBelow && state.entries.length > 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4" data-testid="text-end-of-list">
                {t("leaderboard.endOfList")}
              </p>
            ) : null}
          </div>
        )}

        {state.me && !meVisible && state.entries.length > 0 ? (
          <Button
            type="button"
            onClick={scrollToMe}
            className="absolute bottom-6 right-4 shadow-lg z-10"
            size="sm"
            data-testid="button-back-to-my-rank"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            {t("leaderboard.backToMyRank", { rank: state.me.rank })}
          </Button>
        ) : null}
      </main>
    </div>
  );
}
