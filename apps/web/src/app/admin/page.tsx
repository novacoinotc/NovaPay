"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, ArrowDownToLine, ArrowUpFromLine, Loader2, Clock } from "lucide-react";

interface Stats {
  totalMerchants: number;
  totalBalanceMxn: string;
  totalDeposits: number;
  totalWithdrawals: number;
  depositsToday: number;
  withdrawalsToday: number;
  pendingDeposits: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
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

  const cards = [
    {
      title: "Total Merchants",
      value: stats?.totalMerchants || 0,
      icon: Users,
      color: "from-purple-500 to-purple-300",
    },
    {
      title: "Balance Total Sistema",
      value: `$${parseFloat(stats?.totalBalanceMxn || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-300",
    },
    {
      title: "Depósitos Hoy",
      value: stats?.depositsToday || 0,
      icon: ArrowDownToLine,
      color: "from-purple-500 to-purple-300",
    },
    {
      title: "Retiros Hoy",
      value: stats?.withdrawalsToday || 0,
      icon: ArrowUpFromLine,
      color: "from-amber-500 to-amber-300",
    },
    {
      title: "Total Depósitos",
      value: stats?.totalDeposits || 0,
      icon: ArrowDownToLine,
      color: "from-primary-500 to-primary-300",
    },
    {
      title: "Total Retiros",
      value: stats?.totalWithdrawals || 0,
      icon: ArrowUpFromLine,
      color: "from-red-500 to-red-300",
    },
    {
      title: "Depósitos Pendientes",
      value: stats?.pendingDeposits || 0,
      icon: Clock,
      color: "from-yellow-500 to-yellow-300",
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Panel de Administración</h1>
        <p className="text-zinc-400 mt-1">Vista general del sistema NovaPay</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => (
          <div key={card.title} className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm text-zinc-400">{card.title}</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-zinc-100">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
