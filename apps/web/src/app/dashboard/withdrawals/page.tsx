"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  AlertCircle,
} from "lucide-react";
import { BUSINESS_RULES } from "@novapay/shared";

interface Withdrawal {
  id: string;
  amountMxn: string;
  feeMxn: string;
  netAmountMxn: string;
  clabe: string;
  speiReference: string | null;
  speiTrackingId: string | null;
  status: string;
  failureReason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

interface Stats {
  balanceMxn: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: { label: "Pendiente", color: "text-yellow-400 bg-yellow-500/10", icon: Clock },
  PROCESSING: { label: "Procesando", color: "text-blue-400 bg-blue-500/10", icon: ArrowRight },
  COMPLETED: { label: "Completado", color: "text-green-400 bg-green-500/10", icon: CheckCircle },
  FAILED: { label: "Fallido", color: "text-red-400 bg-red-500/10", icon: XCircle },
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [withdrawalsRes, statsRes] = await Promise.all([
        fetch(`/api/withdrawals?page=${page}&pageSize=20`),
        fetch("/api/stats"),
      ]);

      const withdrawalsData = await withdrawalsRes.json();
      const statsData = await statsRes.json();

      if (withdrawalsData.success) {
        setWithdrawals(withdrawalsData.data.items);
        setHasMore(withdrawalsData.data.hasMore);
      }
      if (statsData.success) {
        setStats(statsData.data.stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum < BUSINESS_RULES.MIN_WITHDRAWAL_MXN) {
      setError(`Monto mínimo: $${BUSINESS_RULES.MIN_WITHDRAWAL_MXN} MXN`);
      setSubmitting(false);
      return;
    }

    if (amountNum > BUSINESS_RULES.MAX_WITHDRAWAL_MXN) {
      setError(`Monto máximo: $${BUSINESS_RULES.MAX_WITHDRAWAL_MXN} MXN`);
      setSubmitting(false);
      return;
    }

    const totalRequired = amountNum + BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
    if (stats && totalRequired > stats.balanceMxn) {
      setError(`Saldo insuficiente. Necesitas $${totalRequired.toFixed(2)} MXN (incluye comisión)`);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMxn: amountNum }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Error al procesar retiro");
        return;
      }

      setShowModal(false);
      setAmount("");
      fetchData();
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const formatMxn = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  };

  const maskClabe = (clabe: string) => {
    return `****${clabe.slice(-4)}`;
  };

  if (loading && withdrawals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Retiros SPEI</h1>
          <p className="text-slate-400 mt-1">
            Saldo disponible:{" "}
            <span className="font-semibold text-green-400">
              {formatMxn(stats?.balanceMxn || 0)} MXN
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!stats || stats.balanceMxn < BUSINESS_RULES.MIN_WITHDRAWAL_MXN + BUSINESS_RULES.WITHDRAWAL_FEE_MXN}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Solicitar retiro
        </button>
      </div>

      {/* Info card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Información de retiros</p>
          <ul className="mt-1 space-y-1 text-blue-400">
            <li>Monto mínimo: ${BUSINESS_RULES.MIN_WITHDRAWAL_MXN} MXN</li>
            <li>Monto máximo: ${BUSINESS_RULES.MAX_WITHDRAWAL_MXN.toLocaleString()} MXN</li>
            <li>Comisión por retiro: ${BUSINESS_RULES.WITHDRAWAL_FEE_MXN} MXN</li>
            <li>Los retiros SPEI se procesan en horario bancario</li>
          </ul>
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-100 mb-2">
            Sin retiros aún
          </h3>
          <p className="text-slate-400">
            Tus retiros SPEI aparecerán aquí
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.05] border-b border-white/[0.08]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    CLABE destino
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {withdrawals.map((withdrawal) => {
                  const status = statusConfig[withdrawal.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={withdrawal.id} className="hover:bg-white/[0.03]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(withdrawal.requestedAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-200">
                          {formatMxn(withdrawal.amountMxn)} MXN
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {formatMxn(withdrawal.feeMxn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {maskClabe(withdrawal.clabe)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {withdrawal.speiReference || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {withdrawal.failureReason && (
                          <p className="text-xs text-red-400 mt-1">
                            {withdrawal.failureReason}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(hasMore || page > 1) && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">Página {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de retiro */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#0f0f17] border border-white/[0.1] rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Solicitar retiro SPEI
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Monto a retirar (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={BUSINESS_RULES.MIN_WITHDRAWAL_MXN}
                    max={Math.min(
                      BUSINESS_RULES.MAX_WITHDRAWAL_MXN,
                      (stats?.balanceMxn || 0) - BUSINESS_RULES.WITHDRAWAL_FEE_MXN
                    )}
                    step="0.01"
                    required
                    className="w-full pl-8 pr-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 text-slate-100 placeholder-slate-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Saldo disponible: {formatMxn(stats?.balanceMxn || 0)} MXN
                </p>
              </div>

              <div className="bg-white/[0.05] rounded-lg p-4 border border-white/[0.08]">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Monto solicitado:</span>
                  <span className="font-medium text-slate-200">
                    {amount ? formatMxn(parseFloat(amount)) : "$0.00"} MXN
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Comisión:</span>
                  <span className="text-slate-400">
                    {formatMxn(BUSINESS_RULES.WITHDRAWAL_FEE_MXN)} MXN
                  </span>
                </div>
                <hr className="my-2 border-white/[0.08]" />
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-slate-200">Total a descontar:</span>
                  <span className="text-slate-100">
                    {amount
                      ? formatMxn(parseFloat(amount) + BUSINESS_RULES.WITHDRAWAL_FEE_MXN)
                      : formatMxn(BUSINESS_RULES.WITHDRAWAL_FEE_MXN)}{" "}
                    MXN
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg hover:bg-white/[0.1] text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Procesando..." : "Confirmar retiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
