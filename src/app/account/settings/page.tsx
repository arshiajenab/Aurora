"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogOut, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * /account/settings — password change, account deletion, and logout.
 *
 * Two destructive actions live here:
 *   - Change password (PUT /api/users/me/password)
 *   - Delete account (DELETE /api/users/me, requires password confirmation)
 * Both surface confirmation dialogs / clear errors.
 */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export default function AccountSettingsPage() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onChangePassword = async (values: PasswordValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not change password");
      }
      toast.success("Password updated", {
        description: "Use your new password next time you sign in.",
      });
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not delete account");
      }
      toast.success("Account deleted");
      await signOut();
      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeletePassword("");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2">
          <Eyebrow>Security</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your password, session, and account.
          </p>
        </div>
      </Reveal>

      {/* Change password */}
      <Reveal delay={0.04}>
        <Card className="rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <KeyRound className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">
              Change password
            </h2>
          </div>
          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="mt-5 flex max-w-md flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-fit gap-1.5 rounded-full"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </Card>
      </Reveal>

      {/* Session */}
      <Reveal delay={0.06}>
        <Card className="rounded-2xl p-6">
          <h2 className="text-base font-semibold tracking-tight">Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user?.email}</span>.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-1.5 rounded-full"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Log out
          </Button>
        </Card>
      </Reveal>

      {/* Danger zone */}
      <Reveal delay={0.08}>
        <Card className="rounded-2xl border-destructive/30 p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">
              Delete account
            </h2>
          </div>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Permanently remove your account, orders, and saved data. This
            action is irreversible — type your password to confirm.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-1.5 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </Button>
        </Card>
      </Reveal>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <span>
                  This permanently deletes your account and all associated
                  orders, addresses, and wishlist items. This cannot be undone.
                </span>
                <Separator />
                <span className="font-medium text-foreground">
                  Enter your password to confirm.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Your password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletePassword("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!deletePassword || deleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
