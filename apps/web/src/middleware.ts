import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Proteger rutas /admin - solo ADMIN
    if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/api/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Restricciones para empleados
    if (token?.employeeId) {
      const path = req.nextUrl.pathname;

      // Rutas permitidas para CASHIER
      const cashierAllowed = [
        "/dashboard/cobrar",
        "/api/cobros",
        "/api/auth",
      ];

      // Rutas adicionales para MANAGER
      const managerExtra = [
        "/dashboard/cobros-historial",
      ];

      const isAllowed =
        path === "/dashboard" || // allow base dashboard redirect
        cashierAllowed.some((p) => path.startsWith(p)) ||
        (token.employeeRole === "MANAGER" && managerExtra.some((p) => path.startsWith(p)));

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/dashboard/cobrar", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rutas públicas que no requieren autenticación
        const publicPaths = ["/", "/login", "/register", "/employee-login", "/api/auth", "/api/health"];
        const isPublicPath = publicPaths.some((path) =>
          req.nextUrl.pathname.startsWith(path)
        );

        if (isPublicPath) return true;

        // Rutas internas (worker → API)
        if (req.nextUrl.pathname.startsWith("/api/internal")) {
          const apiKey = req.headers.get("x-internal-api-key");
          return apiKey === process.env.INTERNAL_API_KEY;
        }

        // Resto de rutas requieren autenticación
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
