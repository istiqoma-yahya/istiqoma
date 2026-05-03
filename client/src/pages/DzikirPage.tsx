import { useState, useEffect } from "react";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories } from "@/hooks/use-categories";
import { useCustomDzikirTypes, useCreateCustomDzikirType, useRenameCustomDzikirType, useDeleteCustomDzikirType } from "@/hooks/use-dzikir-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RotateCcw, Save, Loader2, Plus, Settings, Trash2, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const BUILT_IN_DZIKIR_TYPES = [
  { id: "subhanallah", labelKey: "dzikir.types.subhanallah" },
  { id: "alhamdulillah", labelKey: "dzikir.types.alhamdulillah" },
  { id: "allahuakbar", labelKey: "dzikir.types.allahuakbar" },
  { id: "lailahaillallah", labelKey: "dzikir.types.lailahaillallah" },
  { id: "istighfar", labelKey: "dzikir.types.istighfar" },
] as const;

const BUILT_IN_IDS = new Set(BUILT_IN_DZIKIR_TYPES.map((t) => t.id));

export default function DzikirPage() {
  const [count, setCount] = useState(0);
  const [selectedDzikirType, setSelectedDzikirType] = useState<string>(() => {
    return localStorage.getItem("lastDzikirType") || "subhanallah";
  });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameLabel, setRenameLabel] = useState("");

  const handleSelectChange = (val: string) => {
    if (val === "__add_custom__") {
      setNewLabel("");
      setAddDialogOpen(true);
      return;
    }
    setSelectedDzikirType(val);
  };

  const { data: categories = [] } = useCategories();
  const { data: customTypes = [] } = useCustomDzikirTypes();
  const { mutate: createDeed, isPending: isSaving } = useCreateDeed();
  const { mutate: createCustomType, isPending: isCreating } = useCreateCustomDzikirType();
  const { mutate: renameCustomType, isPending: isRenaming } = useRenameCustomDzikirType();
  const { mutate: deleteCustomType } = useDeleteCustomDzikirType();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    localStorage.setItem("lastDzikirType", selectedDzikirType);
  }, [selectedDzikirType]);

  const dzikirCategory = categories.find(
    (c) => c.name.toLowerCase() === "dzikr" || c.name.toLowerCase() === "dzikir"
  );

  const getDzikirLabel = (typeId: string): string => {
    if (BUILT_IN_IDS.has(typeId)) {
      return t(`dzikir.types.${typeId}`);
    }
    const custom = customTypes.find((c) => c.id === Number(typeId.replace("custom:", "")));
    return custom?.label ?? typeId;
  };

  const getDzikirTypeForDeed = (typeId: string): string => {
    if (BUILT_IN_IDS.has(typeId)) return typeId;
    const custom = customTypes.find((c) => c.id === Number(typeId.replace("custom:", "")));
    return custom?.label ?? typeId;
  };

  const handleTap = () => {
    setCount((prev) => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleSave = () => {
    if (count === 0) {
      toast({
        title: t("dzikir.nothingToSave"),
        description: t("dzikir.tapCounterFirst"),
        variant: "destructive",
      });
      return;
    }

    const dzikirTypeLabel = getDzikirLabel(selectedDzikirType);
    const dzikirTypeValue = getDzikirTypeForDeed(selectedDzikirType);

    createDeed(
      {
        description: t("dzikir.dzikirTypeDeedDesc", { type: dzikirTypeLabel, count }),
        category: dzikirCategory?.name || "Dzikr",
        points: count,
        quantity: count,
        dzikirType: dzikirTypeValue,
        customUnit: "times",
        createdAt: new Date(),
      },
      {
        onSuccess: () => {
          toast({
            title: t("dzikir.dzikirSaved"),
            description: t("dzikir.dzikirTypeSavedDesc", { type: dzikirTypeLabel, count }),
          });
          setCount(0);
        },
        onError: () => {
          toast({
            title: t("dzikir.failedToSave"),
            description: t("dzikir.tryAgain"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleAddCustomType = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    createCustomType(trimmed, {
      onSuccess: (created) => {
        toast({
          title: t("dzikir.customTypeAdded"),
          description: trimmed,
        });
        setSelectedDzikirType(`custom:${created.id}`);
        setNewLabel("");
        setAddDialogOpen(false);
      },
      onError: (err) => {
        toast({
          title: t("dzikir.failedToSave"),
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleOpenRename = (id: number, currentLabel: string) => {
    setRenamingId(id);
    setRenameLabel(currentLabel);
    setRenameDialogOpen(true);
  };

  const handleRenameCustomType = () => {
    const trimmed = renameLabel.trim();
    if (!trimmed || renamingId === null) return;
    renameCustomType(
      { id: renamingId, label: trimmed },
      {
        onSuccess: () => {
          toast({ title: t("dzikir.customTypeRenamed"), description: trimmed });
          setRenameDialogOpen(false);
          setRenamingId(null);
          setRenameLabel("");
        },
        onError: (err) => {
          toast({
            title: t("dzikir.failedToSave"),
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDeleteCustomType = (id: number) => {
    const wasSelected = selectedDzikirType === `custom:${id}`;
    deleteCustomType(id, {
      onSuccess: () => {
        toast({ title: t("dzikir.customTypeDeleted") });
        if (wasSelected) setSelectedDzikirType("subhanallah");
      },
      onError: () => {
        toast({ title: t("dzikir.failedToSave"), variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">{t("dzikir.title")}</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">{t("dzikir.dzikirDesc")}</p>
        </div>

        {/* Type selector row */}
        <div className="flex items-center gap-2 mb-6 w-full max-w-sm">
          <Select
            value={selectedDzikirType}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger
              className="flex-1"
              data-testid="select-dzikir-type"
            >
              <SelectValue placeholder={t("dzikir.selectType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("dzikir.builtInTypes")}</SelectLabel>
                {BUILT_IN_DZIKIR_TYPES.map((type) => (
                  <SelectItem
                    key={type.id}
                    value={type.id}
                    data-testid={`select-item-dzikir-${type.id}`}
                  >
                    {t(type.labelKey)}
                  </SelectItem>
                ))}
              </SelectGroup>

              {customTypes.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>{t("dzikir.customTypes")}</SelectLabel>
                    {customTypes.map((ct) => (
                      <SelectItem
                        key={ct.id}
                        value={`custom:${ct.id}`}
                        data-testid={`select-item-dzikir-custom-${ct.id}`}
                      >
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}

              <SelectSeparator />
              <SelectItem
                value="__add_custom__"
                className="text-emerald-500 font-medium"
                data-testid="select-item-add-custom-dzikir"
              >
                <Plus className="w-4 h-4 mr-1 inline-block" />
                {t("dzikir.addCustomType")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => { setNewLabel(""); setAddDialogOpen(true); }}
            data-testid="button-add-custom-dzikir-type"
            title={t("dzikir.addCustomType")}
          >
            <Plus className="w-4 h-4" />
          </Button>

          {customTypes.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setManageDialogOpen(true)}
              data-testid="button-manage-custom-dzikir-types"
              title={t("dzikir.manageCustomTypes")}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Counter */}
        <Card className="w-full max-w-sm p-8 flex flex-col items-center gap-6">
          <button
            onClick={handleTap}
            className="w-48 h-48 rounded-full flex items-center justify-center transition-all active:scale-95 bg-emerald-500/20 border-4 border-emerald-500 active:bg-emerald-500/30 hover:bg-emerald-500/25"
            data-testid="button-dzikir-tap"
          >
            <span className="text-6xl font-bold text-emerald-500" data-testid="text-dzikir-count">
              {count}
            </span>
          </button>

          <p className="text-sm text-muted-foreground">{t("dzikir.tapToCount")}</p>
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
            {t("dzikir.reset")}
          </Button>

          <Button
            onClick={handleSave}
            disabled={count === 0 || isSaving}
            className="flex items-center gap-2 py-2 text-base font-medium bg-emerald-500 hover:bg-emerald-600"
            data-testid="button-dzikir-save"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {`${t("dzikir.save")} (+${count})`}
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground max-w-xs">{t("dzikir.dzikirReminder")}</p>
        </div>
      </main>

      <BottomNavigation />

      {/* Add custom type dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dzikir.addCustomType")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("dzikir.customTypePlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomType()}
            data-testid="input-custom-dzikir-label"
            autoFocus
          />
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddCustomType}
              disabled={!newLabel.trim() || isCreating}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="button-confirm-add-custom-dzikir"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename custom type dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dzikir.renameCustomType")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("dzikir.customTypePlaceholder")}
            value={renameLabel}
            onChange={(e) => setRenameLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameCustomType()}
            data-testid="input-rename-dzikir-label"
            autoFocus
          />
          <p className="text-xs text-muted-foreground" data-testid="text-rename-history-note">
            {t("dzikir.renameHistoryNote")}
          </p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRenameCustomType}
              disabled={!renameLabel.trim() || isRenaming}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="button-confirm-rename-custom-dzikir"
            >
              {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage custom types dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dzikir.manageCustomTypes")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {customTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("dzikir.noCustomTypes")}
              </p>
            ) : (
              customTypes.map((ct) => (
                <div
                  key={ct.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/30"
                >
                  <span className="text-sm font-medium truncate">{ct.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => handleOpenRename(ct.id, ct.label)}
                      data-testid={`button-rename-custom-dzikir-${ct.id}`}
                      title={t("dzikir.renameCustomType")}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => handleDeleteCustomType(ct.id)}
                      data-testid={`button-delete-custom-dzikir-${ct.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
