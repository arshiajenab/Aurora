"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, Mail, User } from "lucide-react";
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
 * /signup — premium centered auth card.
 *
 * - RHF + Zod schema (name/email/password/confirm).
 * - Password strength meter (length-based, monochrome).
 * - On submit calls signUp() from useAuth() and redirects to callbackUrl
 *   or /account.
 * - If already authenticated, redirect to /account.
 */

const formSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof formSchema>;

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Strong"];
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signUp } = useAuth();
  const mounted = useMounted();

  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
    mode: "onBlur",
  });

  const password = watch("password");
  const strength = passwordStrength(password ?? "");

  React.useEffect(() => {
    if (mounted && !loading && user) {
      router.replace(callbackUrl);
    }
  }, [mounted, loading, user, router, callbackUrl]);

  const onSubmit = async (values: FormValues) => {
    try {
      await signUp(values.name, values.email, values.password);
      toast.success("Account created", {
        description: "Welcome to Aurora.",
      });
      router.push(callbackUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign up failed.";
      setError("email", { message });
      toast.error("Couldn't create your account", { description: message });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
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
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Join Aurora to track orders, save favorites, and check out faster.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-7 flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Appleseed"
                  className="pl-9"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="pl-9"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
              </div>
              {strength.score > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-1 flex-1 gap-1 overflow-hidden rounded-full">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={
                          i <= strength.score
                            ? "flex-1 rounded-full bg-foreground transition-colors"
                            : "flex-1 rounded-full bg-muted transition-colors"
                        }
                      />
                    ))}
                  </div>
                  <span className="w-12 text-[11px] text-muted-foreground">
                    {strength.label}
                  </span>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Check className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="pl-9"
                  aria-invalid={!!errors.confirm}
                  {...register("confirm")}
                />
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive">
                  {errors.confirm.message}
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
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/signin${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
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

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          By creating an account, you agree to our terms of service and
          acknowledge our privacy policy.
        </p>
      </motion.div>
    </div>
  );
}
