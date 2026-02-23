import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

async function loadUserSession(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) return null;

  const membership = user.memberships[0] ?? null;

  return {
    id: user.id.toString(),
    email: user.email ?? user.phone ?? "",
    name: user.name ?? user.email ?? user.phone ?? "",
    platformRole: user.platformRole ?? null,
    role: membership?.role ?? null,
    organizationId: membership?.organizationId ?? null,
    campusId: membership?.campusId ?? null,
    membershipId: membership?.id ?? null,
    organizationStructure: membership?.organization?.organizationStructure ?? null,
    unitPath: membership?.unitPath ?? null,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Sairex Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) return null;

        if (!user.emailVerifiedAt && !user.platformRole) return null;

        if (!user.password) return null;

        const passwordValid = await bcrypt.compare(
          credentials?.password as string,
          user.password,
        );

        if (!passwordValid) return null;

        const membership = user.memberships[0] ?? null;

        return {
          id: user.id.toString(),
          email: user.email ?? "",
          name: user.name ?? user.email ?? "",
          platformRole: user.platformRole ?? null,
          role: membership?.role ?? null,
          organizationId: membership?.organizationId ?? null,
          campusId: membership?.campusId ?? null,
          membershipId: membership?.id ?? null,
          organizationStructure: membership?.organization?.organizationStructure ?? null,
          unitPath: membership?.unitPath ?? null,
        };
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone Login",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        const userId = parseInt(credentials?.userId as string, 10);
        if (!userId || isNaN(userId)) return null;
        return loadUserSession(userId);
      },
    }),
  ],
});
