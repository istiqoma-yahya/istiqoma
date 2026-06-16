import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useGuest } from "@/hooks/use-guest";
import { useCategories, useCategoryName } from "@/hooks/use-categories";
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
import { Plus, Loader2, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Extend schema to ensure coercion for form handling
const formSchema = insertDeedSchema.extend({
  points: z.coerce.number().min(1, "Points must be at least 1"),
  createdAt: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function getCurrentDateTime() {
  const now = new Date();
  return {
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
  };
}

export function CreateDeedDialog() {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateDeed();
  const { isGuest, promptSignup } = useGuest();
  const { data: categories = [] } = useCategories();
  const translateCategoryName = useCategoryName();
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      description: "",
      deedType: "good",
      category: "",
      points: 1,
      createdAt: undefined,
    },
  });

  useEffect(() => {
    setDateTime(getCurrentDateTime());
  }, [open]);

  useEffect(() => {
    if (categories.length > 0 && !form.getValues("category")) {
      form.setValue("category", categories[0].name);
    }
  }, [categories, form]);

  const onSubmit = (data: FormValues) => {
    if (isGuest) {
      promptSignup();
      return;
    }
    // Combine date and time if provided
    let createdAt = data.createdAt;
    if (dateTime.date && dateTime.time) {
      const combinedDateTime = new Date(`${dateTime.date}T${dateTime.time}:00`);
      if (!isNaN(combinedDateTime.getTime())) {
        createdAt = combinedDateTime;
      }
    }
    
    mutate({ ...data, quantity: data.points, createdAt }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setDateTime(getCurrentDateTime());
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
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-[425px]">
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
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{translateCategoryName(cat.name)}</SelectItem>
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
                      <SelectContent className="bg-popover border-border text-popover-foreground">
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

            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">Record Date & Time (Optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </label>
                  <Input
                    type="date"
                    value={dateTime.date}
                    onChange={(e) => setDateTime({ ...dateTime, date: e.target.value })}
                    className="glass-input"
                    data-testid="input-deed-date"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time
                  </label>
                  <Input
                    type="time"
                    value={dateTime.time}
                    onChange={(e) => setDateTime({ ...dateTime, time: e.target.value })}
                    className="glass-input"
                    data-testid="input-deed-time"
                  />
                </div>
              </div>
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
