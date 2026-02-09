"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";

interface MerchantDetail {
  id: string;
  businessName: string;
  email: string;
  rfc: string;
  phone: string;
  clabe: string;
  spreadPercent: string;
  autoSpeiEnabled: boolean;
  balanceMxn: string;
  status: string;
  role: string;
  createdAt: string;
}

interface WalletData {
  id: string;
  network: string;
  asset: string;
  address: string;
  isActive: boolean;
}

interface Deposit {
  id: string;
  txHash: string;
  network: string;
  asset: string;
  amountCrypto: string;
  amountMxn: string | null;
  status: string;
  detectedAt: string;
}

interface Withdrawal {
  id: string;
  amountMxn: string;
  feeMxn: string;
  netAmountMxn: string;
  clabe: string;
  status: string;
  requestedAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/20",
  BLOCKED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CREDITED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  SWEPT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function MerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchant();
  }, [params.id]);

  const fetchMerchant = async () => {
    try {
      const response = await fetch(`/api/admin/merchants/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setMerchant(data.data.merchant);
        setWallets(data.data.wallets);
        setDeposits(data.data.recentDeposits);
        setWithdrawals(data.data.recentWithdrawals);
      }
    } catch (error) {
      console.error("Error fetching merchant:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/merchants/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        setMerchant((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error("Error updating merchant:", error);
    } finally {
      setUpdating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Merchant no encontrado</p>
        <Link href="/admin/merchants" className="text-primary-400 hover:text-primary-300 mt-2 inline-block">
          Volver a merchants
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/merchants"
            className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-400 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
              {merchant.businessName}
            </h1>
            <p className="text-zinc-400 text-sm">{merchant.email}</p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              statusColors[merchant.status] || statusColors.PENDING
            }`}
          >
            {merchant.status}
          </span>
        </div>
        <div className="flex gap-2">
          {merchant.status !== "ACTIVE" && (
            <button
              onClick={() => updateStatus("ACTIVE")}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Activar
            </button>
          )}
          {merchant.status !== "SUSPENDED" && (
            <button
              onClick={() => updateStatus("SUSPENDED")}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Suspender
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="glass-card p-4 sm:p-6">
          <p className="text-sm text-zinc-400 mb-1">Balance</p>
          <p className="text-xl font-bold text-zinc-100">
            ${parseFloat(merchant.balanceMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
          </p>
        </div>
        <div className="glass-card p-4 sm:p-6">
          <p className="text-sm text-zinc-400 mb-1">RFC</p>
          <p className="text-lg font-semibold text-zinc-100">{merchant.rfc}</p>
        </div>
        <div className="glass-card p-4 sm:p-6">
          <p className="text-sm text-zinc-400 mb-1">Spread</p>
          <p className="text-lg font-semibold text-zinc-100">{merchant.spreadPercent}%</p>
        </div>
        <div className="glass-card p-4 sm:p-6">
          <p className="text-sm text-zinc-400 mb-1">Auto SPEI</p>
          <p className="text-lg font-semibold text-zinc-100">
            {merchant.autoSpeiEnabled ? "Activado" : "Desactivado"}
          </p>
        </div>
      </div>

      {/* CLABE */}
      <div className="glass-card p-4 sm:p-6 mb-8">
        <p className="text-sm text-zinc-400 mb-2">CLABE Interbancaria</p>
        <div className="flex items-center gap-2">
          <code className="text-sm text-zinc-100 font-mono">{merchant.clabe}</code>
          <button onClick={() => copyText(merchant.clabe)} className="p-1 hover:bg-white/[0.08] rounded transition-colors">
            {copied === merchant.clabe ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Wallets */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Wallets ({wallets.length})
        </h2>
        {wallets.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-zinc-400">Sin wallets generadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-100">{wallet.asset}</span>
                  <span className="text-xs text-zinc-500">{wallet.network}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-zinc-400 font-mono break-all flex-1">
                    {wallet.address}
                  </code>
                  <button onClick={() => copyText(wallet.address)} className="p-1 hover:bg-white/[0.08] rounded flex-shrink-0 transition-colors">
                    {copied === wallet.address ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Deposits */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5" /> Últimos Depósitos
        </h2>
        {deposits.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-zinc-400">Sin depósitos</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">TX Hash</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">Red</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Crypto</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">MXN</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {deposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <code className="text-xs text-zinc-400 font-mono">
                          {dep.txHash.slice(0, 12)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{dep.network}</td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-100">
                        {parseFloat(dep.amountCrypto).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-100">
                        {dep.amountMxn ? `$${parseFloat(dep.amountMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            statusColors[dep.status] || statusColors.PENDING
                          }`}
                        >
                          {dep.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">
                        {new Date(dep.detectedAt).toLocaleString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Withdrawals */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5" /> Últimos Retiros
        </h2>
        {withdrawals.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-zinc-400">Sin retiros</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Monto</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Fee</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Neto</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase px-4 py-3">CLABE</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase px-4 py-3">Estado</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-right text-sm text-zinc-100">
                        ${parseFloat(w.amountMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        ${parseFloat(w.feeMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-100">
                        ${parseFloat(w.netAmountMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{w.clabe}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            statusColors[w.status] || statusColors.PENDING
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">
                        {new Date(w.requestedAt).toLocaleString("es-MX")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
