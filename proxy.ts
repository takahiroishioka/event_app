import { isTibasibuPath } from "./lib/tibasibu/public-path";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // tibasibu: independent public module; do not read the event app session.
  if (isTibasibuPath(request.nextUrl.pathname)) return NextResponse.next();

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options);
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublicEventDetail =
    /^\/events\/[^/]+\/?$/.test(pathname);

  const isPublicPage =
    pathname === "/api/guest-reservations" ||
    pathname === "/" ||
    pathname === "/event-app-service" || pathname === "/event-app-service/" ||
    pathname === "/event-app-service/opengraph-image" ||
    pathname === "/study-requests" || pathname === "/study-requests/" ||
    isPublicEventDetail ||
    pathname === "/lines" ||
    (pathname.startsWith("/lines/") && !pathname.startsWith("/lines/mypage")) ||
    pathname.startsWith("/users/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/callback");

  if ((error || !user) && !isPublicPage) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  if (
    user &&
    (pathname.startsWith("/login") ||
      pathname.startsWith("/signup"))
  ) {
    const mypageUrl = request.nextUrl.clone();

    const requestedPath = request.nextUrl.searchParams.get("redirect") ?? "/mypage";
    const safeRedirect = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") && !requestedPath.includes("\\");
    const destination = new URL(safeRedirect ? requestedPath : "/mypage", request.url);
    mypageUrl.pathname = destination.pathname;
    mypageUrl.search = destination.search;

    return NextResponse.redirect(mypageUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Social preview crawlers must fetch generated images without authentication.
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image/?$|lines/opengraph-image/?$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
