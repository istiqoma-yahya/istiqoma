import { useEffect, useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BookOpen, ChevronRight, Download, Link2, Loader2, Lock, Mail, Sparkles, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AchievementsSection } from "@/components/AchievementsSection";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isNative } from "@/lib/capacitor";
import { openNativeLoginWithProvider, openNativeBrowser } from "@/lib/native-login";
import { useQuery } from "@tanstack/react-query";
import {
  changePinSchema,
  updateProfileSchema,
  type ChangePinInput,
  type UpdateProfileInput,
} from "@shared/models/auth";
import type { UserOnboarding } from "@shared/schema";

// ─── Quran Foundation connection card ────────────────────────────
// Surfaces the per-user "Connect Quran Foundation" / "Disconnect" UI
// on the profile page. Connection is a one-click OAuth handoff: we
// hit GET /api/qf/connect, the server starts the PKCE flow, redirects
// the user to QF, and on return drops them back at /profile?qf=...
// (handled below to show a toast). Local data continues to work even
// if QF is never connected.
function QuranFoundationConnectCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const status = useQuery<{ configured: boolean; connected: boolean; env: string }>({
    queryKey: ["/api/qf/status"],
  });

  // Show toast on return from the OAuth callback redirect, then strip
  // the marker query params so reloads don't re-fire the toast.
  useEffect(() => {
    const url = new URL(window.location.href);
    const qf = url.searchParams.get("qf");
    if (!qf) return;
    if (qf === "connected") {
      toast({ title: t("profile.qfConnectSuccess") });
    } else if (qf === "error") {
      toast({ title: t("profile.qfConnectError"), variant: "destructive" });
    }
    url.searchParams.delete("qf");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/qf/disconnect");
    },
    onSuccess: () => {
      toast({ title: t("profile.qfDisconnectSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/qf/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quran/bookmarks"] });
    },
  });

  // Hide the card entirely when the server is not configured for QF
  // (e.g. a developer running locally without QF_USER_CLIENT_ID set).
  // Showing a non-functional button would just confuse the user.
  if (!status.data?.configured) return null;

  if (status.data.connected) {
    return (
      <Card className="p-5 border-emerald-500/30 bg-emerald-500/5" data-testid="card-qf-connected">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium mb-1" data-testid="text-qf-connected-heading">
              {t("profile.qfConnectedHeading")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{t("profile.qfConnectedDesc")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              data-testid="button-qf-disconnect"
            >
              {disconnectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("profile.qfDisconnectCta")}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5" data-testid="card-qf-connect">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium mb-1">{t("profile.qfConnectTitle")}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t("profile.qfConnectDesc")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isNative) {
                // Fetch the QF auth URL from the server (authenticated WebView
                // request), then open it in the system browser so the OAuth
                // flow runs in SFSafariViewController / Chrome Custom Tab.
                fetch("/api/qf/connect-native", { credentials: "include" })
                  .then((r) => r.json())
                  .then(({ url }: { url: string }) => openNativeBrowser(url))
                  .catch(console.error);
              } else {
                window.location.href = "/api/qf/connect";
              }
            }}
            data-testid="button-qf-connect"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {t("profile.qfConnectCta")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const Q5_ICONS: Record<string, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  usePageMeta({
    title: t("seo.profile.title"),
    description: t("seo.profile.description"),
    locale: i18n.language?.split("-")[0] ?? "en",
    canonicalPath: "/profile",
  });
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: onboarding } = useQuery<UserOnboarding | null>({
    queryKey: ["/api/onboarding"],
    enabled: isAuthenticated,
  });

  // If the auth probe finished and there is no user, send the visitor to the
  // login screen instead of leaving them stuck on a spinner.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (isNative) {
        // On native, navigate to "/" (Landing/AuthWrapper) which has the
        // proper native login UI. Opening /api/login in the WebView would
        // break the OIDC cookie flow.
        navigate("/");
      } else {
        window.location.href = "/api/login";
      }
    }
  }, [isLoading, isAuthenticated, navigate]);
  const { toast } = useToast();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema) as unknown as Resolver<UpdateProfileInput>,
    defaultValues: {
      username: "",
      phoneNumber: "",
    },
  });

  // Reset the form whenever the user record loads/changes so prefilled
  // values reflect what's currently in the database.
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username ?? "",
        phoneNumber: user.phoneNumber ?? "",
      });
    }
  }, [user?.id, user?.username, user?.phoneNumber, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: UpdateProfileInput) => {
      const res = await apiRequest("PATCH", "/api/auth/user", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.saveSuccess") });
    },
    onError: (err: Error) => {
      // apiRequest throws errors shaped as "<status>: <body>". A 409 means
      // the username is already claimed by another user — surface that as
      // an inline field error instead of a generic toast.
      const match = err.message.match(/^(\d{3}):/);
      if (match && match[1] === "409") {
        form.setError("username", {
          type: "server",
          message: t("profile.usernameTaken"),
        });
        return;
      }
      toast({
        title: t("profile.saveError"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: UpdateProfileInput) => saveMutation.mutate(values);

  const isUsernameAuth = user?.authProvider === "username";

  const pinForm = useForm<ChangePinInput>({
    resolver: zodResolver(changePinSchema) as unknown as Resolver<ChangePinInput>,
    defaultValues: { currentPin: "", newPin: "", confirmPin: "" },
  });

  const changePinMutation = useMutation({
    mutationFn: async (values: ChangePinInput) => {
      const res = await apiRequest(
        "POST",
        "/api/auth/username/change-pin",
        values,
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("profile.changePinSuccess") });
      pinForm.reset({ currentPin: "", newPin: "", confirmPin: "" });
    },
    onError: (err: Error) => {
      const match = err.message.match(/^(\d{3}):\s*([\s\S]*)$/);
      let body: { message?: string; field?: string } = {};
      if (match) {
        try {
          body = JSON.parse(match[2]);
        } catch {
          body = { message: match[2] };
        }
      }
      if (body.field === "currentPin") {
        pinForm.setError("currentPin", {
          type: "server",
          message: t("profile.changePinWrongCurrent"),
        });
        return;
      }
      toast({
        title: t("profile.changePinError"),
        description: body.message ?? err.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.setItem("accountDeleted", "1");
      window.location.href = "/";
    },
    onError: (err: Error) => {
      toast({
        title: t("profile.dangerZone.deleteError"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleExportData = () => {
    window.open("/api/account/export", "_blank");
  };

  const emailEndsWithGmail = (user?.email ?? "").toLowerCase().endsWith("@gmail.com");
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const avatarInitial =
    (user?.firstName && user.firstName.charAt(0).toUpperCase()) ||
    (user?.email && user.email.charAt(0).toUpperCase()) ||
    "?";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold" data-testid="text-profile-title">
              {t("profile.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isLoading || !user ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={user.profileImageUrl ?? undefined} alt={fullName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {avatarInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p
                    className="font-semibold truncate"
                    data-testid="text-profile-name"
                  >
                    {fullName || t("profile.unnamed")}
                  </p>
                  <p
                    className="text-sm text-muted-foreground truncate"
                    data-testid="text-profile-email"
                  >
                    {user.email ?? "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {t("profile.identityNote")}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold mb-4" data-testid="text-profile-personal-heading">
                {t("profile.personalHeading")}
              </h2>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                  data-testid="form-profile"
                >
                  {isUsernameAuth ? (
                    // Username-auth users have their handle in the separate
                    // `username_logins` namespace; it's set at signup and
                    // shown here read-only. The editable profile field is
                    // only for SSO users who own a `users.username`.
                    <FormItem>
                      <FormLabel>{t("profile.usernameLabel")}</FormLabel>
                      <Input
                        value={user?.username ?? ""}
                        readOnly
                        disabled
                        data-testid="input-username-readonly"
                      />
                    </FormItem>
                  ) : (
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.usernameLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              maxLength={40}
                              placeholder={t("profile.usernamePlaceholder")}
                              data-testid="input-username"
                              onChange={(e) => {
                                field.onChange(e);
                                // Clear the server-side "username taken" error
                                // as soon as the user edits the field again.
                                if (form.formState.errors.username?.type === "server") {
                                  form.clearErrors("username");
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("profile.usernameHelp")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("profile.phoneLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            maxLength={30}
                            inputMode="tel"
                            placeholder={t("profile.phonePlaceholder")}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormDescription>
                          {t("profile.phoneHelp")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {saveMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {saveMutation.isPending
                        ? t("profile.saving")
                        : t("profile.saveButton")}
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>

            <AchievementsSection />

            <Card className="p-5" data-testid="card-journey">
              <button
                type="button"
                onClick={() => navigate("/profile/onboarding")}
                className="w-full flex items-center gap-3 text-left"
                data-testid="button-edit-onboarding"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  {onboarding?.identityKey ? (
                    <span className="text-lg leading-none">
                      {Q5_ICONS[onboarding.identityKey] ?? "🌿"}
                    </span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-medium"
                    data-testid="text-journey-title"
                  >
                    {t("profile.journeyTitle")}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground truncate"
                    data-testid="text-journey-subtitle"
                  >
                    {onboarding?.identityKey
                      ? t(
                          `onboarding.identities.${onboarding.identityKey}.name`,
                        )
                      : t("profile.journeySubtitleEmpty")}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </Card>

            {isUsernameAuth && (
              <Card className="p-5" data-testid="card-change-pin">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold" data-testid="text-change-pin-heading">
                    {t("profile.changePinHeading")}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("profile.changePinDesc")}
                </p>
                <Form {...pinForm}>
                  <form
                    onSubmit={pinForm.handleSubmit((v) =>
                      changePinMutation.mutate(v),
                    )}
                    className="space-y-4"
                    data-testid="form-change-pin"
                  >
                    <FormField
                      control={pinForm.control}
                      name="currentPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.currentPinLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              inputMode="numeric"
                              autoComplete="current-password"
                              maxLength={8}
                              data-testid="input-current-pin"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pinForm.control}
                      name="newPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.newPinLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              inputMode="numeric"
                              autoComplete="new-password"
                              maxLength={8}
                              data-testid="input-new-pin"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pinForm.control}
                      name="confirmPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.confirmPinLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              inputMode="numeric"
                              autoComplete="new-password"
                              maxLength={8}
                              data-testid="input-confirm-pin"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={changePinMutation.isPending}
                        data-testid="button-change-pin-submit"
                      >
                        {changePinMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {t("profile.changePinButton")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            )}

            {!isUsernameAuth && emailEndsWithGmail ? (
              <Card
                className="p-5 border-emerald-500/30 bg-emerald-500/5"
                data-testid="card-gmail-connected"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" data-testid="text-gmail-connected">
                      {t("profile.gmailConnected", { email: user.email })}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5" data-testid="card-connect-gmail">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium mb-1">
                      {t("profile.connectGmailTitle")}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("profile.connectGmailDesc")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        openNativeLoginWithProvider("google").catch(console.error);
                      }}
                      data-testid="button-connect-gmail"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      {t("profile.connectGmailCta")}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <QuranFoundationConnectCard />

            <Card className="p-5 border-destructive/40" data-testid="card-danger-zone">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <h2 className="text-base font-semibold text-destructive" data-testid="text-danger-zone-heading">
                  {t("profile.dangerZone.heading")}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t("profile.dangerZone.description")}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportData}
                  className="justify-start gap-2"
                  data-testid="button-export-data"
                >
                  <Download className="w-4 h-4" />
                  {t("profile.dangerZone.exportButton")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="justify-start gap-2"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("profile.dangerZone.deleteButton")}
                </Button>
              </div>
            </Card>
          </>
        )}
      </main>

      <footer className="pb-24 pt-2 space-y-4">
        <div
          className="mx-4 rounded-lg border border-border bg-muted/40 p-4 space-y-1"
          data-testid="section-profile-privacy-contact"
        >
          <p className="text-xs font-medium text-foreground">{t("privacyContact.heading")}</p>
          <p className="text-xs text-muted-foreground">
            {t("privacyContact.body")}{" "}
            <a
              href="mailto:appistiqoma@gmail.com"
              className="text-primary underline underline-offset-2"
              data-testid="link-profile-privacy-email"
            >
              {t("privacyContact.email")}
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground">{t("privacyContact.responseNote")}</p>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-profile-privacy">
              Privacy Policy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/terms" className="hover:text-foreground transition-colors" data-testid="link-profile-terms">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">
              {t("profile.dangerZone.dialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-desc">
              {t("profile.dangerZone.dialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteAccountMutation.isPending}
              data-testid="button-delete-cancel"
            >
              {t("profile.dangerZone.dialogCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteAccountMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("profile.dangerZone.dialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
