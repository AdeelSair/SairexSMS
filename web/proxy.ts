import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { SECURITY_HEADERS } from "@/lib/security";

const { auth } = NextAuth(authConfig);

export default auth((_request) => {
  const response = NextResponse.next();

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  return response;
});

export const config = {
  // Apply auth guard + security headers to all app/API routes except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
