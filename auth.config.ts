import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET || "ai",
  providers: [], // Providers that require Node.js are added in auth.ts
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
