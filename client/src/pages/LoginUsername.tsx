import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  forgotPinSchema,
  usernameSigninSchema,
  usernameSignupSchema,
  type ForgotPinInput,
  type UsernameSigninInput,
  type UsernameSignupInput,
} from "@shared/models/auth";
import istiqomaVerticalLogo from "@assets/Istiqoma_New_Vertical_Logo_1777797342711.png";

type ServerError = { message?: string; field?: string; minutes?: number };

async function parseServerError(err: Error): Promise<ServerError & { status?: number }> {
  const match = err.message.match(/^(\d{3}):\s*([\s\S]*)$/);
  if (!match) return { message: err.message };
  const status = Number(match[1]);
  const body = match[2];
  try {
    const parsed = JSON.parse(body);
    return { ...(parsed as ServerError), status };
  } catch {
    return { message: body, status };
  }
}

/**
 * Live "X minute(s) remaining" countdown driven by a one-second tick. The
 * server returns an integer `minutes` field; we convert it to a target
 * timestamp on first render and tick down from there. Returns `null` once
 * the lockout window has elapsed so the caller can clear its locked state.
 */
function useLockoutCountdown(minutes: number | null): {
  totalSeconds: number;
  expired: boolean;
} {
  const [now, setNow] = useState(() => Date.now());
  const target = useMemo(
    () => (minutes != null ? Date.now() + minutes * 60_000 : null),
    // Reset target whenever a fresh `minutes` value comes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minutes],
  );
  useEffect(() => {
    if (target == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (target == null) return { totalSeconds: 0, expired: true };
  const remainingMs = Math.max(0, target - now);
  return {
    totalSeconds: Math.ceil(remainingMs / 1000),
    expired: remainingMs <= 0,
  };
}

export default function LoginUsername() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Recovery-code reveal modal: shown ONCE after a successful signup so the
  // user has a chance to copy their code. Closing the modal navigates home.
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  // Forgot-PIN dialog state.
  const [forgotOpen, setForgotOpen] = useState(false);

  const signinForm = useForm<UsernameSigninInput>({
    resolver: zodResolver(usernameSigninSchema),
    defaultValues: { username: "", pin: "" },
  });

  // Lockout state surfaced from the most recent 423 response, scoped to the
  // username it applies to. The countdown hook ticks this down once per
  // second; when it hits zero we clear the locked banner so the user can
  // try again without reloading. We also clear it whenever the user types
  // a different username so the lock for one account doesn't block another.
  const [lockedFor, setLockedFor] = useState<{
    username: string;
    minutes: number;
  } | null>(null);
  const lockedMinutes = lockedFor?.minutes ?? null;
  const lockout = useLockoutCountdown(lockedMinutes);
  useEffect(() => {
    if (lockedFor != null && lockout.expired) {
      setLockedFor(null);
    }
  }, [lockedFor, lockout.expired]);

  // Watch the username field so the lock for one account doesn't bleed
  // over and disable the form when the user switches to a different one.
  // We only show / enforce the lock when the current input matches the
  // username that triggered it (case-insensitive).
  const signinUsernameInput = signinForm.watch("username");
  const lockedActive =
    lockedFor != null &&
    !lockout.expired &&
    lockedFor.username.toLowerCase() ===
      (signinUsernameInput ?? "").toLowerCase();

  const signupForm = useForm<UsernameSignupInput>({
    resolver: zodResolver(usernameSignupSchema),
    defaultValues: { username: "", pin: "", confirmPin: "" },
  });

  const signinMutation = useMutation({
    mutationFn: async (values: UsernameSigninInput) => {
      const res = await apiRequest("POST", "/api/auth/username/signin", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: async (err: Error) => {
      const e = await parseServerError(err);
      if (e.field === "username") {
        signinForm.setError("username", {
          type: "server",
          message: t("usernameAuth.errors.usernameNotFound"),
        });
      } else if (e.field === "pin") {
        signinForm.setError("pin", {
          type: "server",
          message: t("usernameAuth.errors.wrongPin"),
        });
      } else if (typeof e.minutes === "number") {
        // Surface as the locked banner with countdown — no inline error.
        // Scoped to the username so switching accounts clears the lock.
        const username = signinForm.getValues("username");
        setLockedFor({ username, minutes: e.minutes });
      } else {
        toast({
          title: t("usernameAuth.errors.signinFailed"),
          description: e.message,
          variant: "destructive",
        });
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (values: UsernameSignupInput) => {
      const res = await apiRequest("POST", "/api/auth/username/signup", values);
      return (await res.json()) as {
        id: string;
        username: string;
        recoveryCode: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // DON'T navigate yet — show the recovery code first. The modal's
      // "I've saved it" button is what takes the user home.
      setRecoveryCode(data.recoveryCode);
      setRecoveryCopied(false);
    },
    onError: async (err: Error) => {
      const e = await parseServerError(err);
      if (e.field === "username") {
        signupForm.setError("username", {
          type: "server",
          message: t("usernameAuth.errors.usernameTaken"),
        });
      } else if (e.field === "pin" || e.field === "confirmPin") {
        signupForm.setError(e.field as "pin" | "confirmPin", {
          type: "server",
          message: e.message ?? "",
        });
      } else {
        toast({
          title: t("usernameAuth.errors.signupFailed"),
          description: e.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleCopyRecovery = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setRecoveryCopied(true);
      toast({ title: t("usernameAuth.recoveryCodeCopied") });
    } catch {
      // Clipboard may be denied — leave the visible code as the fallback.
    }
  };

  const formatCountdown = () => {
    const s = lockout.totalSeconds;
    if (s < 60) return t("usernameAuth.lockedSeconds", { seconds: s });
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return t("usernameAuth.lockedMinutesSeconds", {
      minutes: m,
      seconds: String(sec).padStart(2, "0"),
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border app-header bg-background/80 backdrop-blur-md">
        <div className="container max-w-md mx-auto px-4 h-16 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-lg font-semibold"
            data-testid="text-username-login-title"
          >
            {t("usernameAuth.pageTitle")}
          </h1>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-8">
        <div className="flex justify-center mb-6">
          <img
            src={istiqomaVerticalLogo}
            alt="Istiqoma"
            className="h-32 w-auto"
            data-testid="img-logo-vertical"
          />
        </div>
        <Card className="p-5">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "signin" | "signup")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" data-testid="tab-signin">
                {t("usernameAuth.tabs.signin")}
              </TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup">
                {t("usernameAuth.tabs.signup")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5">
              {lockedActive && (
                <div
                  className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 flex items-start gap-2"
                  data-testid="banner-locked"
                  role="alert"
                  aria-live="polite"
                >
                  <Lock className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-destructive"
                      data-testid="text-locked-title"
                    >
                      {t("usernameAuth.lockedTitle")}
                    </p>
                    <p
                      className="text-xs text-destructive/90 mt-0.5"
                      data-testid="text-locked-countdown"
                    >
                      {t("usernameAuth.lockedDescription", {
                        time: formatCountdown(),
                      })}
                    </p>
                  </div>
                </div>
              )}
              <Form {...signinForm}>
                <form
                  onSubmit={signinForm.handleSubmit((v) =>
                    signinMutation.mutate(v),
                  )}
                  className="space-y-4"
                  data-testid="form-signin"
                >
                  <FormField
                    control={signinForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("usernameAuth.fields.username")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="username"
                            maxLength={40}
                            data-testid="input-signin-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signinForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("usernameAuth.fields.pin")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            autoComplete="current-password"
                            maxLength={8}
                            disabled={
                              lockedActive
                            }
                            data-testid="input-signin-pin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      signinMutation.isPending ||
                      (lockedActive)
                    }
                    data-testid="button-signin-submit"
                  >
                    {signinMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("usernameAuth.signinButton")}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setForgotOpen(true)}
                      data-testid="button-forgot-pin"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      {t("usernameAuth.forgotPin")}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <div
                className="mb-4 p-3 rounded-md border border-amber-500/40 bg-amber-500/10 flex items-start gap-2"
                data-testid="warning-pin-recovery"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t("usernameAuth.pinRecoveryWarning")}
                </p>
              </div>
              <Form {...signupForm}>
                <form
                  onSubmit={signupForm.handleSubmit((v) =>
                    signupMutation.mutate(v),
                  )}
                  className="space-y-4"
                  data-testid="form-signup"
                >
                  <FormField
                    control={signupForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("usernameAuth.fields.username")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="username"
                            maxLength={40}
                            data-testid="input-signup-username"
                          />
                        </FormControl>
                        <FormDescription>
                          {t("usernameAuth.usernameHelp")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("usernameAuth.fields.pin")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            maxLength={8}
                            data-testid="input-signup-pin"
                          />
                        </FormControl>
                        <FormDescription>
                          {t("usernameAuth.pinHelp")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="confirmPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("usernameAuth.fields.confirmPin")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            inputMode="numeric"
                            autoComplete="new-password"
                            maxLength={8}
                            data-testid="input-signup-confirm-pin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={signupMutation.isPending}
                    data-testid="button-signup-submit"
                  >
                    {signupMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("usernameAuth.signupButton")}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      {/* Recovery code reveal: shown once after successful signup. */}
      <Dialog
        open={recoveryCode != null}
        onOpenChange={(open) => {
          // Block dismissal until the user explicitly confirms — closing the
          // dialog is what navigates home, and we don't want them to lose
          // the code by clicking outside.
          if (!open && recoveryCode != null) return;
        }}
      >
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          data-testid="dialog-recovery-code"
        >
          <DialogHeader>
            <DialogTitle>{t("usernameAuth.recoveryCodeTitle")}</DialogTitle>
            <DialogDescription>
              {t("usernameAuth.recoveryCodeBody")}
            </DialogDescription>
          </DialogHeader>
          <div
            className="rounded-md border border-border bg-muted px-3 py-3 font-mono text-base text-center tracking-wider break-all"
            data-testid="text-recovery-code"
          >
            {recoveryCode}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopyRecovery}
              data-testid="button-copy-recovery"
            >
              {recoveryCopied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {t("usernameAuth.recoveryCodeCopy")}
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setRecoveryCode(null);
                navigate("/");
              }}
              data-testid="button-recovery-continue"
            >
              {t("usernameAuth.recoveryCodeContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot-PIN reset dialog. */}
      <ForgotPinDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultUsername={signinForm.getValues("username")}
        onSuccess={(username) => {
          setForgotOpen(false);
          // Pre-fill username on the signin form and clear any stale lock.
          signinForm.setValue("username", username);
          signinForm.setValue("pin", "");
          setLockedFor(null);
          toast({
            title: t("usernameAuth.recoveryReset.successTitle"),
            description: t("usernameAuth.recoveryReset.successBody"),
          });
        }}
      />
    </div>
  );
}

function ForgotPinDialog({
  open,
  onOpenChange,
  defaultUsername,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUsername: string;
  onSuccess: (username: string) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const form = useForm<ForgotPinInput>({
    resolver: zodResolver(forgotPinSchema),
    defaultValues: {
      username: defaultUsername,
      recoveryCode: "",
      newPin: "",
      confirmPin: "",
    },
  });

  // Re-seed the username field whenever the dialog is re-opened.
  useEffect(() => {
    if (open) {
      form.reset({
        username: defaultUsername,
        recoveryCode: "",
        newPin: "",
        confirmPin: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultUsername]);

  const mutation = useMutation({
    mutationFn: async (values: ForgotPinInput) => {
      const res = await apiRequest(
        "POST",
        "/api/auth/username/forgot-pin",
        values,
      );
      return res.json();
    },
    onSuccess: () => {
      const username = form.getValues("username");
      onSuccess(username);
    },
    onError: async (err: Error) => {
      const e = await parseServerError(err);
      if (e.status === 429) {
        toast({
          title: t("usernameAuth.recoveryReset.errors.failed"),
          description: t("usernameAuth.recoveryReset.errors.tooManyAttempts"),
          variant: "destructive",
        });
        return;
      }
      if (typeof e.minutes === "number") {
        form.setError("recoveryCode", {
          type: "server",
          message: t("usernameAuth.recoveryReset.errors.lockedFor", {
            minutes: e.minutes,
          }),
        });
        return;
      }
      if (e.field === "recoveryCode") {
        form.setError("recoveryCode", {
          type: "server",
          message: t("usernameAuth.recoveryReset.errors.invalidCode"),
        });
        return;
      }
      if (e.field === "newPin" || e.field === "confirmPin") {
        form.setError(e.field as "newPin" | "confirmPin", {
          type: "server",
          message: e.message ?? "",
        });
        return;
      }
      if (e.field === "username") {
        form.setError("username", {
          type: "server",
          message: e.message ?? "",
        });
        return;
      }
      toast({
        title: t("usernameAuth.recoveryReset.errors.failed"),
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="dialog-forgot-pin">
        <DialogHeader>
          <DialogTitle>{t("usernameAuth.recoveryReset.title")}</DialogTitle>
          <DialogDescription>
            {t("usernameAuth.recoveryReset.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-3"
            data-testid="form-forgot-pin"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("usernameAuth.fields.username")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="username"
                      maxLength={40}
                      data-testid="input-forgot-username"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recoveryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("usernameAuth.recoveryReset.recoveryCodeLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="font-mono uppercase"
                      data-testid="input-forgot-recovery-code"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("usernameAuth.recoveryReset.recoveryCodeHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("usernameAuth.recoveryReset.newPinLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={8}
                      data-testid="input-forgot-new-pin"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("usernameAuth.recoveryReset.confirmPinLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={8}
                      data-testid="input-forgot-confirm-pin"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-forgot-submit"
              >
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {t("usernameAuth.recoveryReset.submit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                data-testid="button-forgot-cancel"
              >
                {t("usernameAuth.recoveryReset.cancel")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
