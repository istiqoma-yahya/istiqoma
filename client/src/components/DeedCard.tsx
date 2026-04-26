import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { type Deed } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import { useDeleteDeed } from "@/hooks/use-deeds";
import { useCategoryName } from "@/hooks/use-categories";
import { useDzikirTypeName } from "@/hooks/use-dzikir-types";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

interface DeedCardProps {
  deed: Deed;
  index: number;
}

export function DeedCard({ deed, index }: DeedCardProps) {
  const [, navigate] = useLocation();
  const { mutate: deleteDeed, isPending } = useDeleteDeed();
  const { t } = useTranslation();
  const translateCategoryName = useCategoryName();
  const translateDzikirType = useDzikirTypeName();

  const date = deed.createdAt ? new Date(deed.createdAt) : new Date();
  
  const getDisplayDescription = () => {
    const isDzikirCategory = deed.category?.toLowerCase() === "dzikir" || deed.category?.toLowerCase() === "dzikr";
    if (isDzikirCategory) {
      if (deed.dzikirType) {
        return translateDzikirType(deed.dzikirType);
      }
      return t('dzikir.dzikirDeedDesc', { count: formatNumber(deed.points || 0) } as Record<string, string>);
    }
    
    if (deed.sholatType && deed.sholatType !== "any") {
      const sholatLabel = t(`sholat.types.${deed.sholatType}`);
      if (deed.isJamaah) {
        return `${sholatLabel} ${t('sholat.inCongregation')}`;
      }
      return sholatLabel;
    }
    
    if (deed.fastingType && deed.fastingType !== "any") {
      return t(`fasting.types.${deed.fastingType}`);
    }
    
    if (deed.quranUnit) {
      const unit = t(`quran.units.${deed.quranUnit}`);
      return deed.quantity != null ? `${formatNumber(deed.quantity)} ${unit}` : unit;
    }
    
    if (deed.sedekahType) {
      return t(`sedekah.types.${deed.sedekahType}`);
    }
    
    if (deed.description && deed.description.trim() !== "") {
      return deed.description;
    }
    
    return translateCategoryName(deed.category);
  };
  
  const displayDescription = getDisplayDescription();

  const handleCardTap = (event: MouseEvent | TouchEvent | PointerEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="dialog"]')) {
      return;
    }
    sessionStorage.setItem("dashboard-scroll", String(window.scrollY));
    navigate(`/edit-deed/${deed.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer touch-manipulation bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30"
      onTap={handleCardTap}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      data-testid={`card-deed-${deed.id}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
              {translateCategoryName(deed.category)}
            </span>
          </div>
          <h3 className="text-lg font-medium text-foreground leading-tight mb-1">
            {displayDescription}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(date, "PPP p")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400" data-testid={`text-deed-points-${deed.id}`}>
            +{formatNumber(deed.points)} {t('stats.points')}
          </span>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
                data-testid="button-delete-deed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border text-card-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deed.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t('deed.deleteWarning')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-secondary border-border hover:bg-muted text-foreground"
                >
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDeed(deed.id);
                  }}
                  className="bg-none bg-rose-500 text-white"
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
