import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Permitir acceso si está autenticado
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rutas públicas que no requieren autenticación
        const publicPaths = ["/", "/login", "/register", "/api/auth", "/api/health"];
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
