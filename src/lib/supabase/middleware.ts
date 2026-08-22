import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Annotated rather than inlined: createServerClient is overloaded and the
  // deprecated get/set/remove overload is tried first, so an inline literal
  // leaves setAll's parameter implicitly any.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(list) {
      list.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      list.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const stripped = path.replace(/^\/(en|ar)/, "") || "/";
  const isPublic = PUBLIC.some((p) => stripped.startsWith(p));

  if (!user && !isPublic) {
    const locale = path.startsWith("/ar") ? "ar" : "en";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", stripped);
    return NextResponse.redirect(url);
  }

  return response;
}
