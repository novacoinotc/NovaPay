"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calculator,
  Loader2,
  Check,
  Clock,
  ArrowLeft,
  History,
  Copy,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";

type ViewState = "calculator" | "qr" | "success";

interface PaymentOrder {
  id: string;
  amountMxn: string;
  tipMxn: string;
  totalMxn: string;
  amountUsdt: string;
  exchangeRate: string;
  spread: string;
  status: string;
  expiresAt: string;
  paidAt: string | null;
  walletAddress: string;
  walletNetwork: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  PAID: { label: "Pagado", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  EXPIRED: { label: "Expirado", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
  CANCELLED: { label: "Cancelado", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function CobrarPage() {
  const [view, setView] = useState<ViewState>("calculator");
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [recentOrders, setRecentOrders] = useState<PaymentOrder[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/cobros?pageSize=10");
      const data = await res.json();
      if (data.success) {
        setRecentOrders(data.data.orders);
      }
    } catch (e) {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  // Poll for payment status when viewing QR
  useEffect(() => {
    if (view !== "qr" || !currentOrder) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cobros/${currentOrder.id}`);
        const data = await res.json();
        if (data.success) {
          if (data.data.status === "PAID") {
            setCurrentOrder({ ...currentOrder, ...data.data });
            setView("success");
            fetchRecentOrders();
          } else if (data.data.status === "EXPIRED") {
            setCurrentOrder({ ...currentOrder, ...data.data });
            setView("calculator");
            setError("La orden expiró");
            fetchRecentOrders();
          }
        }
      } catch (e) {
        // retry next interval
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [view, currentOrder, fetchRecentOrders]);

  // Countdown timer
  useEffect(() => {
    if (view !== "qr" || !currentOrder) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        new Date(currentOrder.expiresAt).getTime() - Date.now()
      );
      setTimeLeft(Math.floor(remaining / 1000));
      if (remaining <= 0) {
        setView("calculator");
        setError("La orden expiró");
        fetchRecentOrders();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [view, currentOrder, fetchRecentOrders]);

  const createOrder = async () => {
    const amountMxn = parseFloat(amount);
    if (isNaN(amountMxn) || amountMxn < 10) {
      setError("Monto mínimo: $10 MXN");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMxn,
          tipMxn: showTip ? parseFloat(tip) || 0 : 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentOrder(data.data);

        const qr = await QRCode.toDataURL(data.data.walletAddress, {
          width: 280,
          margin: 2,
          color: { dark: "#fafafa", light: "#00000000" },
        });
        setQrDataUrl(qr);
        setView("qr");
        fetchRecentOrders();
      } else {
        setError(data.error?.message || "Error al crear cobro");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCalculator = () => {
    setView("calculator");
    setAmount("");
    setTip("");
    setShowTip(false);
    setCurrentOrder(null);
    setError("");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalMxn = (parseFloat(amount) || 0) + (showTip ? parseFloat(tip) || 0 : 0);

  return (
    <div className="animate-fade-in">
      {/* VISTA 1: CALCULADORA */}
      {view === "calculator" && (
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary-400" />
            Cobrar
          </h1>

          <div className="glass-card p-6 sm:p-8 mb-6">
            <p className="text-sm text-zinc-400 mb-3 text-center">Monto a cobrar</p>

            <div className="text-center mb-4">
              <span className="text-4xl sm:text-5xl font-bold text-zinc-100">
                ${totalMxn > 0 ? totalMxn.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </span>
              <span className="text-xl text-zinc-500 ml-2">MXN</span>
            </div>

            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="Ingresa el monto"
              className="input-dark text-center text-xl w-full mb-3"
              autoFocus
              min="10"
              step="0.01"
            />

            {showTip ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-zinc-400">Propina</p>
                  <button
                    onClick={() => { setShowTip(false); setTip(""); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Quitar
                  </button>
                </div>
                <input
                  type="number"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                  className="input-dark text-center w-full"
                  min="0"
                  step="0.01"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowTip(true)}
                className="mt-2 text-sm text-primary-400 hover:text-primary-300 transition-colors w-full text-center"
              >
                + Agregar propina
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center mb-4">{error}</p>
          )}

          <button
            onClick={createOrder}
            disabled={creating || !amount || parseFloat(amount) < 10}
            className="btn-primary w-full !py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <QrCode className="h-5 w-5" />
            )}
            Generar cobro
          </button>

          {/* Cobros recientes */}
          {recentOrders.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> Cobros recientes
              </h3>
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="glass-card p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        ${parseFloat(order.totalMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                      </p>
                      <p className="text-xs text-zinc-500">
                        {parseFloat(order.amountUsdt).toFixed(2)} USDT &middot;{" "}
                        {new Date(order.createdAt).toLocaleString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        statusConfig[order.status]?.color || "text-zinc-400"
                      }`}
                    >
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: QR PAYMENT */}
      {view === "qr" && currentOrder && (
        <div className="max-w-md mx-auto text-center">
          <button
            onClick={() => { setView("calculator"); fetchRecentOrders(); }}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>

          <div className="glass-card p-6 sm:p-8">
            <p className="text-sm text-zinc-400 mb-1">Monto a pagar</p>
            <p className="text-4xl sm:text-5xl font-bold text-zinc-100 mb-1">
              {parseFloat(currentOrder.amountUsdt).toFixed(2)}
              <span className="text-xl text-zinc-400 ml-2">USDT</span>
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              ${parseFloat(currentOrder.totalMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              {parseFloat(currentOrder.tipMxn) > 0 && (
                <span className="text-zinc-600"> (incluye ${parseFloat(currentOrder.tipMxn).toFixed(2)} propina)</span>
              )}
            </p>

            {/* QR Code */}
            <div className="bg-[#0a0f1a] rounded-2xl p-5 inline-block border border-white/[0.06] mb-4">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR" className="w-56 h-56 sm:w-64 sm:h-64" />
              )}
            </div>

            {/* Wallet address */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-[11px] text-zinc-500 font-mono break-all">
                {currentOrder.walletAddress}
              </p>
              <button
                onClick={() => copyAddress(currentOrder.walletAddress)}
                className="p-1 hover:bg-white/[0.08] rounded transition-colors flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </button>
            </div>

            <p className="text-[10px] text-zinc-600 mb-4">
              Red: {currentOrder.walletNetwork} &middot; T.C: ${parseFloat(currentOrder.exchangeRate).toFixed(2)} MXN/USDT &middot; Spread: {parseFloat(currentOrder.spread)}%
            </p>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className={`h-4 w-4 ${timeLeft < 120 ? "text-red-400" : "text-zinc-400"}`} />
              <span className={`text-sm font-mono ${timeLeft < 120 ? "text-red-400" : "text-zinc-400"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
              Esperando pago...
            </div>
          </div>

          <button
            onClick={() => { setView("calculator"); fetchRecentOrders(); }}
            className="btn-secondary mt-4 w-full"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* VISTA 3: PAGO RECIBIDO */}
      {view === "success" && currentOrder && (
        <div className="max-w-md mx-auto text-center">
          <div className="glass-card p-8 sm:p-10">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-3">
              Pago recibido
            </h2>

            <p className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">
              ${parseFloat(currentOrder.totalMxn).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              <span className="text-lg text-emerald-500/60 ml-1">MXN</span>
            </p>

            <p className="text-sm text-zinc-400 mb-1">
              {parseFloat(currentOrder.amountUsdt).toFixed(2)} USDT recibidos
            </p>

            {parseFloat(currentOrder.tipMxn) > 0 && (
              <p className="text-xs text-zinc-500">
                Incluye ${parseFloat(currentOrder.tipMxn).toFixed(2)} de propina
              </p>
            )}
          </div>

          <button onClick={resetCalculator} className="btn-primary mt-6 w-full !py-4 text-lg">
            Nuevo cobro
          </button>
        </div>
      )}
    </div>
  );
}
