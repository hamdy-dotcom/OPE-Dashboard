"use client";

import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/routing";

export function SignOut({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await createClient().auth.signOut();
          router.replace("/login");
          router.refresh();
        })
      }
      className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-raise disabled:opacity-50"
    >
      {label}
    </button>
  );
}
