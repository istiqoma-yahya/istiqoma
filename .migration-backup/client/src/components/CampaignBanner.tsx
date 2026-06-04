import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Campaign } from "@shared/schema";

const AUTO_ADVANCE_MS = 5000;

export function CampaignBanner() {
  const { t } = useTranslation();
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/active"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = campaigns?.length ?? 0;

  const goTo = useCallback((next: number, dir: number) => {
    setDirection(dir);
    setIndex(next);
  }, []);

  const advance = useCallback(() => {
    if (count < 2) return;
    setDirection(1);
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    timerRef.current = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [index, count, advance]);

  if (!campaigns || count === 0) return null;

  const campaign = campaigns[index];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (count < 2) return;
    if (info.offset.x < -40) {
      goTo((index + 1) % count, 1);
    } else if (info.offset.x > 40) {
      goTo((index - 1 + count) % count, -1);
    }
  };

  return (
    <div className="space-y-3 mb-6" data-testid="campaign-banner">
      <h3 className="text-xl font-display font-bold">{t('dashboard.others')}</h3>
      <div className="relative rounded-lg overflow-hidden shadow-sm">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.a
            key={campaign.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            href={campaign.landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={(e) => {
              if (Math.abs((e as unknown as { movementX: number }).movementX ?? 0) > 5) {
                e.preventDefault();
              }
            }}
            data-testid={`link-campaign-banner-${campaign.id}`}
          >
            <img
              src={campaign.bannerImageUrl}
              alt=""
              className="block w-full pointer-events-none"
              style={{ aspectRatio: "238 / 100", objectFit: "cover" }}
              draggable={false}
              data-testid={`img-campaign-banner-${campaign.id}`}
            />
          </motion.a>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-2" data-testid="banner-dots">
          {campaigns.map((c, i) => (
            <button
              key={c.id}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? "w-4 h-1.5 bg-primary"
                  : "w-1.5 h-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Go to banner ${i + 1}`}
              data-testid={`dot-banner-${i}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
