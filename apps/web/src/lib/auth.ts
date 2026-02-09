import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getDb, merchants } from "@novapay/db";
import { eq } from "@novapay/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      businessName: string;
    };
  }

  interface User {
    id: string;
    email: string;
    businessName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    businessName: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y contraseña son requeridos");
        }

        const db = getDb();
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(eq(merchants.email, credentials.email.toLowerCase()))
          .limit(1);

        if (!merchant) {
          throw new Error("Credenciales inválidas");
        }

        const isValidPassword = await compare(
          credentials.password,
          merchant.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Credenciales inválidas");
        }

        if (merchant.status === "BLOCKED") {
          throw new Error("Cuenta bloqueada. Contacta soporte.");
        }

        if (merchant.status === "SUSPENDED") {
          throw new Error("Cuenta suspendida. Contacta soporte.");
        }

        return {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.businessName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.businessName = user.businessName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        businessName: token.businessName,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
