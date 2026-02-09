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
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] bg-grid">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-[#070b14]/95 backdrop-blur-xl border-r border-white/[0.06] z-20">
        <div className="flex h-16 items-center px-6 border-b border-white/[0.06]">
          <Link href="/dashboard" className="text-xl font-bold gradient-text">
            NovaPay
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.businessName?.charAt(0) || "N"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {session?.user?.businessName}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${
                  isActive
                    ? "bg-primary-500/10 text-primary-300 shadow-glow border border-primary-500/20"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/[0.06]">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2.5 text-red-400 rounded-xl hover:bg-red-500/10 w-full transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="bg-[#070b14]/80 backdrop-blur-xl border-b border-white/[0.06] h-16 flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-zinc-100">
            {navigation.find((n) => pathname.startsWith(n.href))?.name || "Dashboard"}
          </h1>
        </header>
        <main className="p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
