import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Sairex Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email as string },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Block unverified email (except platform admins seeded directly)
        if (!user.emailVerifiedAt && !user.platformRole) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials?.password as string,
          user.password,
        );

        if (!passwordValid) return null;

        const membership = user.memberships[0] ?? null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name ?? user.email,
          platformRole: user.platformRole ?? null,
          role: membership?.role ?? null,
          organizationId: membership?.organizationId ?? null,
          campusId: membership?.campusId ?? null,
          membershipId: membership?.id ?? null,
        };
      },
    }),
  ],
});
