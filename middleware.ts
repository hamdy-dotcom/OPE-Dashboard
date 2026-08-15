import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intl = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const authResponse = await updateSession(request);
  if (authResponse.headers.get("location")) return authResponse;

  const response = intl(request);
  authResponse.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
