"use client";

import { useState } from "react";
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
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] bg-grid">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#070b14]/95 backdrop-blur-xl border-b border-white/[0.06] z-30 flex items-center px-4 md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/dashboard" className="ml-3 text-xl font-bold gradient-text">
          NovaPay
        </Link>
      </div>

      {/* Backdrop (mobile only, when sidebar open) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#070b14]/95 backdrop-blur-xl border-r border-white/[0.06] z-30 transform transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex h-16 items-center px-6 border-b border-white/[0.06]">
          <Link
            href="/dashboard"
            className="text-xl font-bold gradient-text"
            onClick={() => setMobileMenuOpen(false)}
          >
            NovaPay
          </Link>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto p-1 text-zinc-400 hover:text-zinc-100 transition-colors md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
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
                onClick={() => setMobileMenuOpen(false)}
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
      <div className="md:pl-64">
        {/* Desktop header */}
        <header className="hidden md:flex bg-[#070b14]/80 backdrop-blur-xl border-b border-white/[0.06] h-16 items-center px-8 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-zinc-100">
            {navigation.find((n) => pathname.startsWith(n.href))?.name || "Dashboard"}
          </h1>
        </header>
        <main className="pt-16 md:pt-0 p-4 md:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
