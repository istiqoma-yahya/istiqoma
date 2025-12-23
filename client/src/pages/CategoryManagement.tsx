import { useState } from "react";
import { useLocation } from "wouter";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Loader2, ArrowLeft } from "lucide-react";

export default function CategoryManagement() {
  const [, navigate] = useLocation();
  const { data: categories = [], isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

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
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display font-bold text-xl">Manage Categories</h1>
          </div>
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-5 h-5" />
                <span>Add Category</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E293B] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Category name (e.g., Reciting Quran)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="glass-input"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={isCreating || !newCategoryName.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold mb-2">Your Categories</h2>
          <p className="text-muted-foreground">Create and manage categories for tracking your deeds.</p>
        </div>

        {categories.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed">
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create your first category to start tracking deeds by category.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="p-4 flex items-center justify-between">
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
                      size="sm"
                      onClick={() => handleUpdateCategory(category.id)}
                      disabled={isUpdating || !editingName.trim()}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium">{category.name}</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1E293B] border-white/10 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              This action cannot be undone. Deeds with this category will keep their category name.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 text-white">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCategory(category.id)}
                              disabled={isDeleting}
                              className="bg-rose-500 hover:bg-rose-600 text-white"
                            >
                              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
