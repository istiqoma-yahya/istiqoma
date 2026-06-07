import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Campaign } from "@shared/schema";

const ADMIN_EMAIL = "yahyaekananta@gmail.com";

const formSchema = z
  .object({
    bannerImageUrl: z.string().min(1, "Banner image is required"),
    landingUrl: z
      .string()
      .url("Must be a valid URL")
      .refine((v) => /^https?:\/\//i.test(v), {
        message: "URL must start with http:// or https://",
      }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Required"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Required"),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })
  .refine((d) => d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date",
  });
type FormValues = z.infer<typeof formSchema>;

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function uploadBannerToStorage(file: File): Promise<string> {
  const urlRes = await apiRequest("POST", "/api/admin/campaigns/upload-url", {
    name: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  });
  const { uploadURL } = (await urlRes.json()) as { uploadURL: string };
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) {
    throw new Error("Failed to upload image");
  }
  return uploadURL;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: Campaign | null;
}) {
  const { toast } = useToast();
  const isEdit = !!campaign;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      bannerImageUrl: "",
      landingUrl: "",
      startDate: "",
      endDate: "",
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        bannerImageUrl: campaign?.bannerImageUrl ?? "",
        landingUrl: campaign?.landingUrl ?? "",
        startDate: campaign?.startDate ?? "",
        endDate: campaign?.endDate ?? "",
        sortOrder: campaign?.sortOrder ?? 0,
      });
      setPreviewUrl(campaign?.bannerImageUrl ?? "");
    }
  }, [open, campaign, form]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && campaign) {
        // Only send changed fields; if banner is unchanged from existing,
        // omit it so the existing image is preserved.
        const body: Partial<FormValues> = { ...values };
        if (body.bannerImageUrl === campaign.bannerImageUrl) {
          delete body.bannerImageUrl;
        }
        const res = await apiRequest(
          "PATCH",
          `/api/admin/campaigns/${campaign.id}`,
          body,
        );
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/campaigns", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({
        title: isEdit ? "Campaign updated" : "Campaign created",
      });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      form.setError("bannerImageUrl", {
        message: "Banner must be PNG, JPEG, or WebP",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      form.setError("bannerImageUrl", {
        message: "Image is too large (max 2MB)",
      });
      return;
    }
    setUploading(true);
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return blobUrl;
    });
    try {
      const uploadUrl = await uploadBannerToStorage(file);
      form.setValue("bannerImageUrl", uploadUrl, { shouldValidate: true });
      form.clearErrors("bannerImageUrl");
    } catch (err) {
      form.setError("bannerImageUrl", {
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-campaign-form">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit campaign" : "New campaign"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="bannerImageUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Banner image (320×100)</FormLabel>
                  <div
                    className="overflow-hidden rounded-md border bg-muted"
                    style={{ width: 320, height: 100 }}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Banner preview"
                        className="h-full w-full"
                        style={{ objectFit: "cover" }}
                        data-testid="img-banner-preview"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image selected
                      </div>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={(e) => onPickFile(e.target.files?.[0])}
                      data-testid="input-banner-file"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {uploading
                      ? "Uploading…"
                      : "PNG, JPEG, or WebP. Max 2MB. Image is fitted to 320×100."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="landingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landing URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                      data-testid="input-landing-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                      data-testid="input-sort-order"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Lower numbers show first in the carousel.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
                data-testid="button-cancel-campaign"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || uploading}
                data-testid="button-save-campaign"
              >
                {mutation.isPending
                  ? "Saving..."
                  : uploading
                    ? "Uploading..."
                    : isEdit
                      ? "Save changes"
                      : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CampaignsList() {
  const { toast } = useToast();
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
  });

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      toast({ title: "Campaign deleted" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          Campaigns
        </h1>
        <Button
          onClick={() => setCreating(true)}
          data-testid="button-create-campaign"
        >
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground" data-testid="text-empty">
          No campaigns yet. Create your first banner.
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              data-testid={`row-campaign-${c.id}`}
            >
              <div
                className="overflow-hidden rounded-md border bg-muted shrink-0"
                style={{ width: 320, height: 100 }}
              >
                <img
                  src={c.bannerImageUrl}
                  alt="Campaign banner"
                  className="h-full w-full"
                  style={{ objectFit: "cover" }}
                  data-testid={`img-banner-${c.id}`}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground" data-testid={`text-order-${c.id}`}>
                    Order: {c.sortOrder}
                  </span>
                  <span className="text-sm" data-testid={`text-dates-${c.id}`}>
                    {formatDateRange(c.startDate, c.endDate)}
                  </span>
                </div>
                <a
                  href={c.landingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                  data-testid={`link-landing-${c.id}`}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.landingUrl}</span>
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(c)}
                  data-testid={`button-edit-${c.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(c)}
                  data-testid={`button-delete-${c.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CampaignFormDialog
        open={creating}
        onOpenChange={setCreating}
        campaign={null}
      />
      <CampaignFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        campaign={editing}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the banner. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminCampaignsPage() {
  const { user, isLoading } = useAuth();

  const isAdmin = useMemo(() => {
    const email = user?.email?.trim().toLowerCase();
    return !!email && email === ADMIN_EMAIL;
  }, [user]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card className="p-6 text-center" data-testid="text-not-authorized">
          <h1 className="text-lg font-semibold">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have access to this page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <CampaignsList />
    </div>
  );
}
