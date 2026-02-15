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
        });

        if (!user || !user.isActive) {
          return null; // User not found or account is locked
        }

        const passwordValid = await bcrypt.compare(
          credentials?.password as string,
          user.password
        );

        if (passwordValid) {
          return {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
          };
        }
        return null;
      },
    }),
  ],
});
