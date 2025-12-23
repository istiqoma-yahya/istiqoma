import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RotateCcw, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DzikirPage() {
  const [, navigate] = useLocation();
  const [count, setCount] = useState(0);
  const { data: categories = [] } = useCategories();
  const { mutate: createDeed, isPending: isSaving } = useCreateDeed();
  const { toast } = useToast();

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
        title: "Nothing to save",
        description: "Tap the counter to add dzikir first.",
        variant: "destructive",
      });
      return;
    }

    createDeed(
      {
        deedType: "good",
        description: `Dzikir - ${count} counts`,
        category: dzikirCategory?.name || "Dzikr",
        points: count,
        createdAt: new Date(),
      },
      {
        onSuccess: () => {
          toast({
            title: "Dzikir saved!",
            description: `${count} dzikir counted and saved as ${count} points.`,
          });
          setCount(0);
        },
        onError: () => {
          toast({
            title: "Failed to save",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">Dzikir Counter</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Tap the counter to record your dzikir. Each tap equals 1 point.
          </p>
        </div>

        <Card className="w-full max-w-sm p-8 flex flex-col items-center gap-6">
          <button
            onClick={handleTap}
            className="w-48 h-48 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center transition-all active:scale-95 active:bg-emerald-500/30 hover:bg-emerald-500/25"
            data-testid="button-dzikir-tap"
          >
            <span className="text-6xl font-bold text-emerald-500" data-testid="text-dzikir-count">
              {count}
            </span>
          </button>

          <p className="text-sm text-muted-foreground">Tap to count</p>
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
            Reset
          </Button>

          <Button
            onClick={handleSave}
            disabled={count === 0 || isSaving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 py-2 text-base font-medium"
            data-testid="button-dzikir-save"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save ({count} points)
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground max-w-xs">
            SubhanAllah, Alhamdulillah, Allahu Akbar - Remember Allah often.
          </p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
