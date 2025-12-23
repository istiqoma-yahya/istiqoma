import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDeed } from "@/hooks/use-deeds";
import { useCategories } from "@/hooks/use-categories";
import { insertDeedSchema } from "@shared/schema";
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
import { Loader2, Calendar, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

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

export default function CreateDeedPage() {
  const [, navigate] = useLocation();
  const { mutate, isPending } = useCreateDeed();
  const { data: categories = [] } = useCategories();
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      deedType: "good",
      category: "",
      points: 1,
      createdAt: undefined,
    },
  });

  useEffect(() => {
    if (categories.length > 0 && !form.getValues("category")) {
      form.setValue("category", categories[0].name);
    }
  }, [categories, form]);

  const onSubmit = (data: FormValues) => {
    let createdAt = data.createdAt;
    if (dateTime.date && dateTime.time) {
      const combinedDateTime = new Date(`${dateTime.date}T${dateTime.time}:00`);
      if (!isNaN(combinedDateTime.getTime())) {
        createdAt = combinedDateTime;
      }
    }

    mutate({ ...data, createdAt }, {
      onSuccess: () => {
        form.reset();
        setDateTime(getCurrentDateTime());
        navigate("/");
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">Record a New Deed</h1>
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-close-deed-form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-12">
        <p className="text-muted-foreground mb-8">
          Track your good actions or mistakes to monitor your spiritual progress.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      data-testid="input-deed-description"
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
                      <SelectTrigger className="glass-input" data-testid="select-deed-category">
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
                        <SelectTrigger className="glass-input" data-testid="select-deed-type">
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
                        data-testid="input-deed-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-white/10">
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 py-2 text-base"
                data-testid="button-cancel-deed"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 text-base shadow-lg shadow-emerald-500/20"
                data-testid="button-submit-deed"
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
      </main>
    </div>
  );
}
