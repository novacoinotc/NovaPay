"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Stats {
  balanceMxn: number;
  deposits: {
    total: number;
    pending: number;
    credited: number;
    totalMxn: number;
  };
  withdrawals: {
    total: number;
    completed: number;
    totalMxn: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
          Bienvenido, {session?.user?.businessName}
        </h1>
        <p className="text-zinc-400 mt-1">
          Aquí tienes el resumen de tu actividad
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="gradient-border-card">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Saldo disponible</p>
                <p className="text-2xl font-bold text-zinc-100">
                  ${(stats?.balanceMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/withdrawals"
              className="mt-4 block text-center py-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 text-sm font-medium transition-all duration-200 border border-emerald-500/10 hover:border-emerald-500/20"
            >
              Retirar fondos
            </Link>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Depósitos recibidos</p>
              <p className="text-2xl font-bold text-zinc-100">
                {stats?.deposits.total || 0}
              </p>
            </div>
          </div>
          {stats?.deposits.pending ? (
            <p className="mt-4 text-sm text-accent-400 bg-accent-500/10 rounded-xl py-2 text-center border border-accent-500/10">
              {stats.deposits.pending} pendiente(s)
            </p>
          ) : (
            <p className="mt-4 text-sm text-zinc-500 text-center py-2">
              Sin pendientes
            </p>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <ArrowUpFromLine className="h-6 w-6 text-accent-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Retiros realizados</p>
              <p className="text-2xl font-bold text-zinc-100">
                {stats?.withdrawals.completed || 0}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500 text-center py-2">
            Total: ${(stats?.withdrawals?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Volumen total</p>
              <p className="text-2xl font-bold text-zinc-100">
                ${(stats?.deposits?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500 text-center py-2">
            Acreditado en total
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Link href="/dashboard/wallets" className="glass-card p-6 group">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-zinc-100">Ver mis wallets</h3>
            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-primary-400 transition-colors" />
          </div>
          <p className="text-sm text-zinc-400">
            Consulta tus direcciones de depósito y genera códigos QR
          </p>
        </Link>

        <Link href="/dashboard/deposits" className="glass-card p-6 group">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-zinc-100">Historial de depósitos</h3>
            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-primary-400 transition-colors" />
          </div>
          <p className="text-sm text-zinc-400">
            Revisa todos los pagos crypto que has recibido
          </p>
        </Link>

        <Link href="/dashboard/settings" className="glass-card p-6 group">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-zinc-100">Configuración</h3>
            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-primary-400 transition-colors" />
          </div>
          <p className="text-sm text-zinc-400">
            Ajusta SPEI automático y otros parámetros
          </p>
        </Link>
      </div>
    </div>
  );
}
