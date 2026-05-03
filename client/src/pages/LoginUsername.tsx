import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  usernameSigninSchema,
  usernameSignupSchema,
  type UsernameSigninInput,
  type UsernameSignupInput,
} from "@shared/models/auth";

type ServerError = { message?: string; field?: string; minutes?: number };

async function parseServerError(err: Error): Promise<ServerError> {
  const match = err.message.match(/^(\d{3}):\s*([\s\S]*)$/);
  if (!match) return { message: err.message };
  const body = match[2];
  try {
    const parsed = JSON.parse(body);
    return parsed as ServerError;
  } catch {
    return { message: body };
  }
}

export default function LoginUsername() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const signinForm = useForm<UsernameSigninInput>({
    resolver: zodResolver(usernameSigninSchema),
    defaultValues: { username: "", pin: "" },
  });

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
        signinForm.setError("pin", {
          type: "server",
          message: t("usernameAuth.errors.lockedFor", { minutes: e.minutes }),
        });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
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
                    disabled={signinMutation.isPending}
                    data-testid="button-signin-submit"
                  >
                    {signinMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("usernameAuth.signinButton")}
                  </Button>
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
    </div>
  );
}
