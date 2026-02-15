import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all routes except API, static files, images, and favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
