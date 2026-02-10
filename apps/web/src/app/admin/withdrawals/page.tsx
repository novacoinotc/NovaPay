"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface WithdrawalAdmin {
  id: string;
  merchantId: string;
  amountMxn: string;
  feeMxn: string;
  netAmountMxn: string;
  clabe: string;
  beneficiaryName: string | null;
  speiReference: string | null;
  speiTrackingId: string | null;
  status: string;
  failureReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  merchantName: string | null;
  merchantEmail: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PROCESSING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalAdmin[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [page, statusFilter]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" });
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/admin/withdrawals?${params}`);
      const data = await response.json();
      if (data.success) {
        setWithdrawals(data.data.withdrawals);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (id: string, action: string, reason?: string) => {
    const actionLabel = action === "retry" ? "reintentar" : action === "fail" ? "rechazar" : "completar";
    if (!confirm(`¿Seguro que deseas ${actionLabel} este retiro?`)) return;

    setActionLoading(id);
    setActionResult(null);
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json();

      if (data.success) {
        setActionResult({ id, message: `${actionLabel} exitoso`, type: "success" });
        fetchWithdrawals();
      } else {
        setActionResult({ id, message: data.error?.message || "Error", type: "error" });
      }
    } catch (error) {
      setActionResult({ id, message: "Error de conexión", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Retiros</h1>
          <p className="text-zinc-400 mt-1">Gestión de retiros SPEI de todos los merchants</p>
        </div>
        <button
          onClick={() => fetchWithdrawals()}
          className="btn-secondary !py-2 flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-3 items-center">
          <span className="text-sm text-zinc-400">Filtrar:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="COMPLETED">Completado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No se encontraron retiros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">Merchant</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Monto</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Neto</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">CLABE</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">Motivo fallo</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Fecha</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-100">{w.merchantName}</p>
                      <p className="text-xs text-zinc-500">{w.merchantEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-100">
                      ${parseFloat(w.amountMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      ${parseFloat(w.netAmountMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{w.clabe}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[w.status] || statusColors.PENDING}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-red-400 max-w-[200px] truncate">
                      {w.failureReason || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {new Date(w.requestedAt).toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      {actionResult?.id === w.id && (
                        <p className={`text-xs mb-1 ${actionResult.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                          {actionResult.message}
                        </p>
                      )}
                      {(w.status === "PENDING" || w.status === "PROCESSING" || w.status === "FAILED") && (
                        <div className="flex items-center gap-1 justify-center">
                          {/* Retry */}
                          <button
                            onClick={() => performAction(w.id, "retry")}
                            disabled={actionLoading === w.id}
                            className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-400 transition-colors disabled:opacity-30"
                            title="Reintentar SPEI"
                          >
                            {actionLoading === w.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                          {/* Fail + Refund */}
                          {w.status !== "FAILED" && (
                            <button
                              onClick={() => performAction(w.id, "fail", "Rechazado por admin")}
                              disabled={actionLoading === w.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-30"
                              title="Rechazar y reembolsar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {/* Mark complete */}
                          <button
                            onClick={() => performAction(w.id, "complete")}
                            disabled={actionLoading === w.id}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors disabled:opacity-30"
                            title="Marcar como completado"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-white/[0.06]">
            <p className="text-sm text-zinc-400">{pagination.total} retiros en total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-zinc-300">{page} / {pagination.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
