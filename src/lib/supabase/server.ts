import { cookies } from "next/headers";
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  // Annotated rather than inlined: createServerClient is overloaded and the
  // deprecated get/set/remove overload is tried first, so an inline literal
  // leaves setAll's parameter implicitly any.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(list) {
      try {
        list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // called from a Server Component — middleware refreshes the session
      }
    },
  };

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  );
}
