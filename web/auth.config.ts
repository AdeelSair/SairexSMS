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
      const isOnOnboarding = nextUrl.pathname.startsWith("/onboarding");

      if (isOnAdmin || isOnOnboarding) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as Record<string, unknown>).id;
        token.platformRole = (user as Record<string, unknown>).platformRole ?? null;
        token.role = (user as Record<string, unknown>).role ?? null;
        token.organizationId = (user as Record<string, unknown>).organizationId ?? null;
        token.campusId = (user as Record<string, unknown>).campusId ?? null;
        token.membershipId = (user as Record<string, unknown>).membershipId ?? null;
      }

      if (trigger === "update" && session) {
        const s = session as Record<string, unknown>;
        if (s.role !== undefined) token.role = s.role;
        if (s.organizationId !== undefined) token.organizationId = s.organizationId;
        if (s.campusId !== undefined) token.campusId = s.campusId;
        if (s.membershipId !== undefined) token.membershipId = s.membershipId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as Record<string, unknown>;
        u.id = token.id;
        u.platformRole = token.platformRole ?? null;
        u.role = token.role ?? null;
        u.organizationId = token.organizationId ?? null;
        u.campusId = token.campusId ?? null;
        u.membershipId = token.membershipId ?? null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
