"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Camera,
  Check,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMounted } from "@/shared/hooks/use-mounted";

/**
 * /account/profile — edit display name, phone, avatar, and change password.
 *
 * Two separate RHF + Zod forms:
 *   - Profile form (name, phone, avatar URL) → PATCH /api/users/me
 *   - Password form (current, new, confirm) → PUT /api/users/me/password
 *
 * Avatar upload: POST /api/upload?kind=avatars (multipart "files") → {urls};
 * the returned URL is shown as a preview and persisted on profile save.
 */

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().max(40).nullable().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function initials(name: string | null, email: string): string {
  const base = name ?? email;
  return base.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const mounted = useMounted();
  const { user, refresh } = useAuth();

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
  });

  // Sync form values once the user loads.
  React.useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name ?? "",
      phone: user.phone ?? "",
    });
    setAvatarUrl(user.avatar);
  }, [user, profileForm]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Max 5MB." });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/upload?kind=avatars", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        urls?: string[];
        error?: string;
      };
      if (!res.ok || !data.urls?.[0]) {
        throw new Error(data.error ?? "Upload failed");
      }
      const url = data.urls[0];
      setAvatarUrl(url);
      // Persist avatar immediately so the header dropdown updates too.
      const patchRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
        credentials: "same-origin",
      });
      if (!patchRes.ok) {
        const err = (await patchRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't save avatar");
      }
      await refresh();
      toast.success("Avatar updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed";
      toast.error("Couldn't upload image", { description: message });
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected.
      e.target.value = "";
    }
  };

  const onProfileSubmit = async (values: ProfileValues) => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone ?? null,
        }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as
        | { user?: { name: string | null; phone: string | null; avatar: string | null } }
        | { error?: string };
      if (!res.ok || !("user" in data && data.user)) {
        throw new Error(
          "error" in data && data.error ? data.error : "Couldn't save profile",
        );
      }
      await refresh();
      toast.success("Profile saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Save failed";
      toast.error("Couldn't save profile", { description: message });
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't change password");
      }
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirm: "",
      });
      toast.success("Password updated", {
        description: "Use your new password next time you sign in.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't change password";
      toast.error("Couldn't change password", { description: message });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = profileForm;

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = passwordForm;

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2">
          <Eyebrow>Account</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your display name, contact details, and avatar.
          </p>
        </div>
      </Reveal>

      {/* Profile + avatar */}
      <Reveal delay={0.04}>
        <Card className="rounded-2xl border-border/60 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 sm:w-40">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={avatarUrl ?? undefined}
                  alt={user.name ?? ""}
                />
                <AvatarFallback className="text-xl">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onUpload}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                  {uploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Camera className="h-3 w-3" />
                      Change
                    </>
                  )}
                </span>
              </label>
            </div>

            <Separator
              orientation="vertical"
              className="hidden h-40 sm:block"
            />

            {/* Form */}
            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="flex flex-1 flex-col gap-4"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Jane Appleseed"
                      className="pl-9"
                      aria-invalid={!!profileErrors.name}
                      {...registerProfile("name")}
                    />
                  </div>
                  {profileErrors.name && (
                    <p className="text-xs text-destructive">
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user.email}
                      readOnly
                      disabled
                      className="pl-9 cursor-not-allowed opacity-70"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Email cannot be changed.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="phone">
                    Phone{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    autoComplete="tel"
                    placeholder="+1 (555) 000-0000"
                    aria-invalid={!!profileErrors.phone}
                    {...registerProfile("phone")}
                  />
                  {profileErrors.phone && (
                    <p className="text-xs text-destructive">
                      {profileErrors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="gap-1.5 rounded-full"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </Reveal>

      {/* Change password */}
      <Reveal delay={0.06}>
        <Card className="rounded-2xl border-border/60 p-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-tight">
                Change password
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Use a strong, unique password at least 8 characters long.
            </p>
          </div>

          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="mt-5 grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!passwordErrors.currentPassword}
                {...registerPassword("currentPassword")}
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!passwordErrors.newPassword}
                {...registerPassword("newPassword")}
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!passwordErrors.confirm}
                {...registerPassword("confirm")}
              />
              {passwordErrors.confirm && (
                <p className="text-xs text-destructive">
                  {passwordErrors.confirm.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                After changing your password, you&apos;ll stay signed in on this
                device. Other devices may need to sign in again.
              </p>
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button
                type="submit"
                disabled={savingPassword}
                className="gap-1.5 rounded-full"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </Reveal>
    </div>
  );
}
