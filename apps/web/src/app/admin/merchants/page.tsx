"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Merchant {
  id: string;
  businessName: string;
  email: string;
  rfc: string;
  balanceMxn: string;
  status: string;
  role: string;
  depositCount: number;
  withdrawalCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/20",
  BLOCKED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchMerchants();
  }, [page, statusFilter]);

  const fetchMerchants = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (searchQuery || search) params.set("search", searchQuery ?? search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/admin/merchants?${params}`);
      const data = await response.json();
      if (data.success) {
        setMerchants(data.data.merchants);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching merchants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMerchants(search);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Merchants</h1>
        <p className="text-zinc-400 mt-1">Gestión de comercios registrados</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <button type="submit" className="btn-primary !py-2 text-sm">
              Buscar
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-primary-500/50"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="PENDING">Pendiente</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No se encontraron merchants</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Negocio
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Balance
                  </th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    Depósitos
                  </th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    Retiros
                  </th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 sm:px-6 py-3 hidden lg:table-cell">
                    Registro
                  </th>
                  <th className="px-4 sm:px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {merchants.map((merchant) => (
                  <tr
                    key={merchant.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-sm font-medium text-zinc-100">
                        {merchant.businessName}
                      </p>
                      <p className="text-xs text-zinc-500 sm:hidden">
                        {merchant.email}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <p className="text-sm text-zinc-400">{merchant.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <p className="text-sm font-medium text-zinc-100">
                        ${parseFloat(merchant.balanceMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center hidden md:table-cell">
                      <p className="text-sm text-zinc-400">{merchant.depositCount}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center hidden md:table-cell">
                      <p className="text-sm text-zinc-400">{merchant.withdrawalCount}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          statusColors[merchant.status] || statusColors.PENDING
                        }`}
                      >
                        {merchant.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right hidden lg:table-cell">
                      <p className="text-xs text-zinc-500">
                        {new Date(merchant.createdAt).toLocaleDateString("es-MX")}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <Link
                        href={`/admin/merchants/${merchant.id}`}
                        className="text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-white/[0.06]">
            <p className="text-sm text-zinc-400">
              {pagination.total} merchants en total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-zinc-300">
                {page} / {pagination.totalPages}
              </span>
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
