import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getDb, merchants, employees } from "@novapay/db";
import { eq, and } from "@novapay/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      businessName: string;
      role: string;
      employeeId?: string;
      employeeName?: string;
      employeeRole?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    businessName: string;
    role: string;
    employeeId?: string;
    employeeName?: string;
    employeeRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    businessName: string;
    role: string;
    employeeId?: string;
    employeeName?: string;
    employeeRole?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
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
          role: merchant.role,
        };
      },
    }),
    CredentialsProvider({
      id: "employee-pin",
      name: "employee-pin",
      credentials: {
        merchantId: { label: "Merchant ID", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.merchantId || !credentials?.pin) {
          throw new Error("Merchant ID y PIN son requeridos");
        }

        const db = getDb();

        // Get merchant
        const [merchant] = await db
          .select()
          .from(merchants)
          .where(eq(merchants.id, credentials.merchantId))
          .limit(1);

        if (!merchant || merchant.status !== "ACTIVE") {
          throw new Error("Negocio no encontrado o inactivo");
        }

        // Get active employees for this merchant
        const activeEmployees = await db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.merchantId, credentials.merchantId),
              eq(employees.isActive, true)
            )
          );

        // Try each employee's PIN
        let matchedEmployee = null;
        for (const emp of activeEmployees) {
          const isMatch = await compare(credentials.pin, emp.pin);
          if (isMatch) {
            matchedEmployee = emp;
            break;
          }
        }

        if (!matchedEmployee) {
          throw new Error("PIN inválido");
        }

        return {
          id: merchant.id,
          email: merchant.email,
          businessName: merchant.businessName,
          role: merchant.role,
          employeeId: matchedEmployee.id,
          employeeName: matchedEmployee.name,
          employeeRole: matchedEmployee.role,
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
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.employeeName = user.employeeName;
        token.employeeRole = user.employeeRole;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        businessName: token.businessName,
        role: token.role,
        employeeId: token.employeeId,
        employeeName: token.employeeName,
        employeeRole: token.employeeRole,
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
