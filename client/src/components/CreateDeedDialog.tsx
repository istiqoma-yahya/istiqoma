import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories } from "@/hooks/use-categories";
import { insertDeedSchema } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Extend schema to ensure coercion for form handling
const formSchema = insertDeedSchema.extend({
  points: z.coerce.number().min(1, "Points must be at least 1"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateDeedDialog() {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateDeed();
  const { data: categories = [] } = useCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      deedType: "good",
      category: "",
      points: 1,
    },
  });

  useEffect(() => {
    if (categories.length > 0 && !form.getValues("category")) {
      form.setValue("category", categories[0].name);
    }
  }, [categories, form]);

  const onSubmit = (data: FormValues) => {
    mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Record Deed</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#1E293B] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Record a New Deed</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Track your good actions or mistakes to monitor your spiritual progress.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Helped a neighbor, Missed prayer..."
                      className="glass-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#1E293B] border-white/10 text-white">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deedType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1E293B] border-white/10 text-white">
                        <SelectItem value="good">Good Deed</SelectItem>
                        <SelectItem value="bad">Bad Deed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points (Weight)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="glass-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-xl text-lg shadow-lg shadow-emerald-500/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Deed"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
