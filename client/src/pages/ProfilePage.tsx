import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2, Mail, Sparkles, User as UserIcon } from "lucide-react";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { updateProfileSchema, type UpdateProfileInput } from "@shared/models/auth";
import type { UserOnboarding } from "@shared/schema";

const Q5_ICONS: Record<string, string> = {
  "dekat-allah": "🤲",
  bermanfaat: "🌟",
  berilmu: "📚",
  istiqomah: "🏔️",
  keluarga: "🏡",
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  const { data: onboarding } = useQuery<UserOnboarding | null>({
    queryKey: ["/api/onboarding"],
    enabled: isAuthenticated,
  });

  // If the auth probe finished and there is no user, send the visitor to the
  // login screen instead of leaving them stuck on a spinner.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isLoading, isAuthenticated]);
  const { toast } = useToast();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
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

            {emailEndsWithGmail ? (
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
                        window.location.href = "/api/login?provider=google";
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
          </>
        )}
      </main>
    </div>
  );
}
