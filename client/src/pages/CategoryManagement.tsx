import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory, useReorderCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Loader2, ArrowLeft, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category } from "@shared/schema";

function SortableCategoryCard({
  category,
  editingId,
  editingName,
  setEditingName,
  setEditingId,
  handleUpdateCategory,
  isUpdating,
  deleteCategory,
  isDeleting,
}: {
  category: Category;
  editingId: number | null;
  editingName: string;
  setEditingName: (name: string) => void;
  setEditingId: (id: number | null) => void;
  handleUpdateCategory: (id: number) => void;
  isUpdating: boolean;
  deleteCategory: (id: number) => void;
  isDeleting: boolean;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 flex items-center justify-between gap-2"
    >
      {editingId === category.id ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="glass-input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdateCategory(category.id);
              if (e.key === "Escape") setEditingId(null);
            }}
          />
          <Button
            onClick={() => handleUpdateCategory(category.id)}
            disabled={isUpdating || !editingName.trim()}
            className="bg-blue-500 hover:bg-blue-600 py-2 text-base font-medium"
          >
            {t('common.save')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditingId(null)}
            className="py-2 text-base"
          >
            {t('common.cancel')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
              data-testid={`drag-handle-${category.id}`}
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-medium">{category.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingId(category.id);
                setEditingName(category.name);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border text-card-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('categories.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. Deeds with this category will keep their category name.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-secondary border-border hover:bg-muted text-foreground">
                    {t('common.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCategory(category.id)}
                    disabled={isDeleting}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </Card>
  );
}

export default function CategoryManagement() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: categories = [], isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: reorderCategories } = useReorderCategories();
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  const displayCategories = localCategories.length > 0 ? localCategories : categories;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      
      setLocalCategories(newOrder);
      reorderCategories(newOrder.map((c) => c.id), {
        onSettled: () => {
          setLocalCategories([]);
        },
      });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategory({ name: newCategoryName }, {
      onSuccess: () => {
        setNewCategoryName("");
        setOpenCreateDialog(false);
      },
    });
  };

  const handleUpdateCategory = (id: number) => {
    if (!editingName.trim()) return;
    updateCategory({ id, name: editingName }, {
      onSuccess: () => {
        setEditingId(null);
        setEditingName("");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">{t('categories.title')}</h1>
          </div>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 py-2 text-base font-medium">
                <Plus className="w-5 h-5" />
                <span>{t('categories.addCategory')}</span>
              </Button>
            </DialogTrigger>
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
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={isCreating || !newCategoryName.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 py-2 text-base font-medium"
                >
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('common.add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold mb-2">{t('categories.customCategories')}</h2>
          <p className="text-muted-foreground">Drag to reorder. Create and manage categories for tracking your deeds.</p>
        </div>

        {categories.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
            <h3 className="text-lg font-medium mb-2">{t('categories.noCustom')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create your first category to start tracking deeds by category.
            </p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayCategories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-4">
                {displayCategories.map((category) => (
                  <SortableCategoryCard
                    key={category.id}
                    category={category}
                    editingId={editingId}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    setEditingId={setEditingId}
                    handleUpdateCategory={handleUpdateCategory}
                    isUpdating={isUpdating}
                    deleteCategory={deleteCategory}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
}
