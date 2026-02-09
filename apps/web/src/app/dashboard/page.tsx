"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, TrendingUp, Loader2 } from "lucide-react";
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          Bienvenido, {session?.user?.businessName}
        </h1>
        <p className="text-slate-400 mt-1">
          Aquí tienes el resumen de tu actividad
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Saldo disponible</p>
              <p className="text-2xl font-bold text-slate-100">
                ${(stats?.balanceMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/withdrawals"
            className="mt-4 block text-center py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 text-sm font-medium transition-colors"
          >
            Retirar fondos
          </Link>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Depósitos recibidos</p>
              <p className="text-2xl font-bold text-slate-100">
                {stats?.deposits.total || 0}
              </p>
            </div>
          </div>
          {stats?.deposits.pending ? (
            <p className="mt-4 text-sm text-yellow-400 bg-yellow-500/10 rounded-lg py-2 text-center">
              {stats.deposits.pending} pendiente(s)
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500 text-center py-2">
              Sin pendientes
            </p>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <ArrowUpFromLine className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Retiros realizados</p>
              <p className="text-2xl font-bold text-slate-100">
                {stats?.withdrawals.completed || 0}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500 text-center py-2">
            Total: ${(stats?.withdrawals?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Volumen total</p>
              <p className="text-2xl font-bold text-slate-100">
                ${(stats?.deposits?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500 text-center py-2">
            Acreditado en total
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/wallets"
          className="glass-card p-6 transition-all"
        >
          <h3 className="font-semibold text-slate-100 mb-2">Ver mis wallets</h3>
          <p className="text-sm text-slate-400">
            Consulta tus direcciones de depósito y genera códigos QR
          </p>
        </Link>

        <Link
          href="/dashboard/deposits"
          className="glass-card p-6 transition-all"
        >
          <h3 className="font-semibold text-slate-100 mb-2">Historial de depósitos</h3>
          <p className="text-sm text-slate-400">
            Revisa todos los pagos crypto que has recibido
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="glass-card p-6 transition-all"
        >
          <h3 className="font-semibold text-slate-100 mb-2">Configuración</h3>
          <p className="text-sm text-slate-400">
            Ajusta SPEI automático y otros parámetros
          </p>
        </Link>
      </div>
    </div>
  );
}
