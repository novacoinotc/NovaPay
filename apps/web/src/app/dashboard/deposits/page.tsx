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
  PENDING: { label: "Pendiente", color: "text-zinc-300 bg-white/[0.06]", icon: Clock },
  CONFIRMED: { label: "Confirmado", color: "text-primary-400 bg-primary-500/10", icon: CheckCircle },
  SWEEPING: { label: "Procesando", color: "text-primary-300 bg-primary-500/10", icon: ArrowRight },
  SWEPT: { label: "Movido", color: "text-accent-400 bg-accent-500/10", icon: ArrowRight },
  CONVERTING: { label: "Convirtiendo", color: "text-zinc-300 bg-white/[0.06]", icon: ArrowRight },
  CREDITED: { label: "Acreditado", color: "text-emerald-400 bg-emerald-500/10", icon: CheckCircle },
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
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Historial de Depósitos</h1>
        <p className="text-zinc-400 mt-1">
          {total} depósito{total !== 1 ? "s" : ""} en total
        </p>
      </div>

      {deposits.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-100 mb-2">
            Sin depósitos aún
          </h3>
          <p className="text-zinc-400">
            Los depósitos que recibas en tus wallets aparecerán aquí
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <table className="w-full table-dark">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>TX Hash</th>
                  <th>Crypto</th>
                  <th>Monto</th>
                  <th>MXN</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => {
                  const status = statusConfig[deposit.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={deposit.id}>
                      <td className="text-zinc-400">
                        {new Date(deposit.detectedAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <a
                          href={`${explorerUrls[deposit.network] || ""}${deposit.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 flex items-center gap-1 font-mono transition-colors"
                        >
                          {deposit.txHash.slice(0, 8)}...{deposit.txHash.slice(-6)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="font-medium text-zinc-200">
                        {deposit.asset.replace("_", " ")}
                      </td>
                      <td className="font-medium text-zinc-200">
                        {parseFloat(deposit.amountCrypto).toFixed(2)}{" "}
                        {deposit.asset.split("_")[0]}
                      </td>
                      <td>
                        {deposit.amountMxn ? (
                          <span className="font-medium text-emerald-400">
                            {formatMxn(deposit.amountMxn)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${status.color}`}>
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
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-400">Página {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
