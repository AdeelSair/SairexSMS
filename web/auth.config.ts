import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (no Prisma / Node.js imports).
 * Used by middleware.ts for route protection.
 * The full config in auth.ts spreads this and adds the adapter + providers.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        // Must be logged in to access admin routes
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.campusId = (user as any).campusId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).campusId = token.campusId ?? null;
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts (not edge-safe)
} satisfies NextAuthConfig;
