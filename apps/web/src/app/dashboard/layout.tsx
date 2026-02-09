"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

const navigation = [
  { name: "Inicio", href: "/dashboard", icon: Home },
  { name: "Wallets", href: "/dashboard/wallets", icon: Wallet },
  { name: "Depósitos", href: "/dashboard/deposits", icon: ArrowDownToLine },
  { name: "Retiros", href: "/dashboard/withdrawals", icon: ArrowUpFromLine },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10">
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-primary-600">
            NovaPay
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b">
          <p className="text-sm font-medium text-gray-900 truncate">
            {session?.user?.businessName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {session?.user?.email}
          </p>
        </div>

        <nav className="mt-4 px-3">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 w-full"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="bg-white shadow-sm h-16 flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-lg font-medium text-gray-900">
            {navigation.find((n) => pathname.startsWith(n.href))?.name || "Dashboard"}
          </h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
