"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";

type Labels = {
  email: string;
  password: string;
  submit: string;
  pending: string;
  failed: string;
};

export function LoginForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      if (error) {
        setError(labels.failed);
        return;
      }
      router.replace((search.get("next") as "/day-board") ?? "/day-board");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3.5">
      <label className="grid gap-1.5">
        <span className="text-[12.5px] text-ink-2">{labels.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-[12.5px] text-ink-2">{labels.password}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-sm text-ink"
        />
      </label>

      {error && <p className="text-[12.5px] text-stop-text">{error}</p>}

      <Button type="submit" variant="primary" disabled={pending} className="mt-1">
        {pending ? labels.pending : labels.submit}
      </Button>
    </form>
  );
}
