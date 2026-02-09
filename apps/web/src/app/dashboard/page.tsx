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
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session?.user?.businessName}
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí tienes el resumen de tu actividad
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Saldo disponible</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(stats?.balanceMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/withdrawals"
            className="mt-4 block text-center py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
          >
            Retirar fondos
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Depósitos recibidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.deposits.total || 0}
              </p>
            </div>
          </div>
          {stats?.deposits.pending ? (
            <p className="mt-4 text-sm text-yellow-600 bg-yellow-50 rounded-lg py-2 text-center">
              {stats.deposits.pending} pendiente(s)
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-400 text-center py-2">
              Sin pendientes
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowUpFromLine className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Retiros realizados</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.withdrawals.completed || 0}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center py-2">
            Total: ${(stats?.withdrawals?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Volumen total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(stats?.deposits?.totalMxn ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center py-2">
            Acreditado en total
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/wallets"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Ver mis wallets</h3>
          <p className="text-sm text-gray-600">
            Consulta tus direcciones de depósito y genera códigos QR
          </p>
        </Link>

        <Link
          href="/dashboard/deposits"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Historial de depósitos</h3>
          <p className="text-sm text-gray-600">
            Revisa todos los pagos crypto que has recibido
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Configuración</h3>
          <p className="text-sm text-gray-600">
            Ajusta SPEI automático y otros parámetros
          </p>
        </Link>
      </div>
    </div>
  );
}
