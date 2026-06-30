"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/shared/components/logo";
import { Eyebrow } from "@/shared/components/section-heading";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMounted } from "@/shared/hooks/use-mounted";

/**
 * /signin — premium centered auth card (Stripe/Vercel-style).
 *
 * - Reads `callbackUrl` from searchParams (set by middleware on protected
 *   route redirects). On success we navigate there or fall back to /account.
 * - If already authenticated, redirect to /account (the middleware would
 *   allow it through anyway, so this is a UX optimization).
 * - RHF + Zod with inline validation; signIn() comes from useAuth() which
 *   hits /api/auth/signin and refreshes the session.
 */

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn } = useAuth();
  const mounted = useMounted();

  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  // If we already have a session, skip the form.
  React.useEffect(() => {
    if (mounted && !loading && user) {
      router.replace(callbackUrl);
    }
  }, [mounted, loading, user, router, callbackUrl]);

  const onSubmit = async (values: FormValues) => {
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back", {
        description: "You're now signed in.",
      });
      router.push(callbackUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed.";
      setError("password", { message });
      toast.error("Couldn't sign you in", { description: message });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient background — subtle grid + radial mask, matches the landing hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-[0.4]"
      />

      <div className="mb-8">
        <Logo />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <Card className="rounded-2xl border-border/60 p-7 sm:p-8">
          <div className="flex flex-col gap-2 text-center">
            <Eyebrow className="justify-center">Account</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your Aurora account.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-7 flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || loading}
              className="mt-2 w-full gap-1.5 rounded-full"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full text-muted-foreground"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
