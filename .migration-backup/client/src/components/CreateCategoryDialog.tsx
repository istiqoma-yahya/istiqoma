import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateCategory } from "@/hooks/use-categories";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (categoryName: string) => void;
}

export function CreateCategoryDialog({ 
  open, 
  onOpenChange,
  onCategoryCreated 
}: CreateCategoryDialogProps) {
  const { t } = useTranslation();
  const [newCategoryName, setNewCategoryName] = useState("");
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategory({ name: newCategoryName, isProtected: false }, {
      onSuccess: () => {
        const createdName = newCategoryName.trim();
        setNewCategoryName("");
        onOpenChange(false);
        if (onCategoryCreated) {
          onCategoryCreated(createdName);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle>{t('categories.addCategory')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input
            placeholder={t('categories.categoryName')}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="glass-input"
            onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            data-testid="input-new-category-name"
            autoFocus
          />
          <Button
            onClick={handleCreateCategory}
            disabled={isCreating || !newCategoryName.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 py-2 text-base font-medium"
            data-testid="button-save-new-category"
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
