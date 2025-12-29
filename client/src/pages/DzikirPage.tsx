import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RotateCcw, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const DZIKIR_TYPES = [
  { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
  { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
  { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
  { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
] as const;

export default function DzikirPage() {
  const [, navigate] = useLocation();
  const [count, setCount] = useState(0);
  const [isIstighfar, setIsIstighfar] = useState(false);
  const [selectedDzikirType, setSelectedDzikirType] = useState<string>(() => {
    return localStorage.getItem("lastDzikirType") || "subhanallah";
  });
  const { data: categories = [] } = useCategories();
  const { mutate: createDeed, isPending: isSaving } = useCreateDeed();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    localStorage.setItem("lastDzikirType", selectedDzikirType);
  }, [selectedDzikirType]);

  const dzikirCategory = categories.find(
    (c) => c.name.toLowerCase() === "dzikr" || c.name.toLowerCase() === "dzikir"
  );

  const handleTap = () => {
    setCount((prev) => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleSave = () => {
    if (count === 0) {
      toast({
        title: t('dzikir.nothingToSave'),
        description: t('dzikir.tapCounterFirst'),
        variant: "destructive",
      });
      return;
    }

    if (isIstighfar) {
      createDeed(
        {
          deedType: "bad",
          description: t('dzikir.istighfarDeedDesc', { count }),
          category: "Istighfar",
          points: count,
          createdAt: new Date(),
        },
        {
          onSuccess: () => {
            toast({
              title: t('dzikir.istighfarSaved'),
              description: t('dzikir.istighfarSavedDesc', { count }),
            });
            setCount(0);
          },
          onError: () => {
            toast({
              title: t('dzikir.failedToSave'),
              description: t('dzikir.tryAgain'),
              variant: "destructive",
            });
          },
        }
      );
    } else {
      const dzikirTypeLabel = t(`dzikir.types.${selectedDzikirType}`);
      createDeed(
        {
          deedType: "good",
          description: t('dzikir.dzikirTypeDeedDesc', { type: dzikirTypeLabel, count }),
          category: dzikirCategory?.name || "Dzikr",
          points: count,
          dzikirType: selectedDzikirType,
          createdAt: new Date(),
        },
        {
          onSuccess: () => {
            toast({
              title: t('dzikir.dzikirSaved'),
              description: t('dzikir.dzikirTypeSavedDesc', { type: dzikirTypeLabel, count }),
            });
            setCount(0);
          },
          onError: () => {
            toast({
              title: t('dzikir.failedToSave'),
              description: t('dzikir.tryAgain'),
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">{t('dzikir.title')}</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            {isIstighfar 
              ? t('dzikir.istighfarDesc')
              : t('dzikir.dzikirDesc')}
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Switch
            id="istighfar-toggle"
            checked={isIstighfar}
            onCheckedChange={setIsIstighfar}
            data-testid="switch-istighfar"
          />
          <Label htmlFor="istighfar-toggle" className="text-base font-medium cursor-pointer">
            {t('dzikir.istighfarMode')}
          </Label>
        </div>

        {!isIstighfar && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {DZIKIR_TYPES.map((type) => (
              <Button
                key={type.id}
                variant={selectedDzikirType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDzikirType(type.id)}
                className={selectedDzikirType === type.id ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                data-testid={`button-dzikir-type-${type.id}`}
              >
                {t(type.labelKey)}
              </Button>
            ))}
          </div>
        )}

        <Card className="w-full max-w-sm p-8 flex flex-col items-center gap-6">
          <button
            onClick={handleTap}
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isIstighfar 
                ? "bg-rose-500/20 border-4 border-rose-500 active:bg-rose-500/30 hover:bg-rose-500/25"
                : "bg-emerald-500/20 border-4 border-emerald-500 active:bg-emerald-500/30 hover:bg-emerald-500/25"
            }`}
            data-testid="button-dzikir-tap"
          >
            <span className={`text-6xl font-bold ${isIstighfar ? "text-rose-500" : "text-emerald-500"}`} data-testid="text-dzikir-count">
              {count}
            </span>
          </button>

          <p className="text-sm text-muted-foreground">
            {isIstighfar ? t('dzikir.tapIstighfar') : t('dzikir.tapToCount')}
          </p>
        </Card>

        <div className="flex items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={count === 0}
            className="flex items-center gap-2 py-2 text-base font-medium"
            data-testid="button-dzikir-reset"
          >
            <RotateCcw className="w-4 h-4" />
            {t('dzikir.reset')}
          </Button>

          <Button
            onClick={handleSave}
            disabled={count === 0 || isSaving}
            className={`flex items-center gap-2 py-2 text-base font-medium ${
              isIstighfar 
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
            data-testid="button-dzikir-save"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isIstighfar ? `${t('dzikir.save')} (-${count})` : `${t('dzikir.save')} (+${count})`}
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground max-w-xs">
            {isIstighfar 
              ? t('dzikir.istighfarReminder')
              : t('dzikir.dzikirReminder')}
          </p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
