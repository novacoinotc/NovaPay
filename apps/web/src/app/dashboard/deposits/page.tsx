"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { formatDate, truncateAddress } from "@novapay/shared";

interface Deposit {
  id: string;
  txHash: string;
  network: string;
  asset: string;
  amountCrypto: string;
  amountMxn: string | null;
  exchangeRate: string | null;
  spreadPercent: string | null;
  status: string;
  confirmations: number;
  detectedAt: string;
  confirmedAt: string | null;
  creditedAt: string | null;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING: { label: "Pendiente", color: "text-yellow-400 bg-yellow-500/10", icon: Clock },
  CONFIRMED: { label: "Confirmado", color: "text-blue-400 bg-blue-500/10", icon: CheckCircle },
  SWEEPING: { label: "Procesando", color: "text-purple-400 bg-purple-500/10", icon: ArrowRight },
  SWEPT: { label: "Movido", color: "text-indigo-400 bg-indigo-500/10", icon: ArrowRight },
  CONVERTING: { label: "Convirtiendo", color: "text-orange-400 bg-orange-500/10", icon: ArrowRight },
  CREDITED: { label: "Acreditado", color: "text-green-400 bg-green-500/10", icon: CheckCircle },
  FAILED: { label: "Fallido", color: "text-red-400 bg-red-500/10", icon: XCircle },
};

const explorerUrls: Record<string, string> = {
  TRON: "https://tronscan.org/#/transaction/",
  ETHEREUM: "https://etherscan.io/tx/",
};

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDeposits();
  }, [page]);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/deposits?page=${page}&pageSize=20`);
      const data = await response.json();
      if (data.success) {
        setDeposits(data.data.items);
        setHasMore(data.data.hasMore);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error("Error fetching deposits:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMxn = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
  };

  if (loading && deposits.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Historial de Depósitos</h1>
        <p className="text-slate-400 mt-1">
          {total} depósito{total !== 1 ? "s" : ""} en total
        </p>
      </div>

      {deposits.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-100 mb-2">
            Sin depósitos aún
          </h3>
          <p className="text-slate-400">
            Los depósitos que recibas en tus wallets aparecerán aquí
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
                    TX Hash
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Crypto
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    MXN
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {deposits.map((deposit) => {
                  const status = statusConfig[deposit.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={deposit.id} className="hover:bg-white/[0.03]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(deposit.detectedAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`${explorerUrls[deposit.network] || ""}${deposit.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                        >
                          {deposit.txHash.slice(0, 8)}...{deposit.txHash.slice(-6)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-200">
                          {deposit.asset.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-200">
                          {parseFloat(deposit.amountCrypto).toFixed(2)}{" "}
                          {deposit.asset.split("_")[0]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {deposit.amountMxn ? (
                          <span className="text-sm font-medium text-green-400">
                            {formatMxn(deposit.amountMxn)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
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
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">Página {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
