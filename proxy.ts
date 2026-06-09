import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth/constants";

const protectedRoutes = [
  "/dashboard",
  "/employees",
  "/attendance",
  "/tasks",
  "/clients",
  "/crm",
  "/users",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/attendance/:path*",
    "/tasks/:path*",
    "/clients/:path*",
    "/crm/:path*",
    "/users/:path*",
    "/login",
  ],
};
