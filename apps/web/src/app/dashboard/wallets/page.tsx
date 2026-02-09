"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, QrCode, Plus, Loader2, Check } from "lucide-react";
import QRCode from "qrcode";

interface Wallet {
  id: string;
  asset: string;
  network: string;
  address: string;
  balance: string;
  isActive: boolean;
}

const assetInfo: Record<string, { name: string; color: string; explorer: string }> = {
  USDT_TRC20: {
    name: "USDT (TRC20)",
    color: "bg-emerald-500",
    explorer: "https://tronscan.org/#/address/",
  },
  USDT_ERC20: {
    name: "USDT (ERC20)",
    color: "bg-primary-500",
    explorer: "https://etherscan.io/address/",
  },
  ETH: {
    name: "Ethereum",
    color: "bg-purple-500",
    explorer: "https://etherscan.io/address/",
  },
  BTC: {
    name: "Bitcoin",
    color: "bg-accent-500",
    explorer: "https://blockchain.info/address/",
  },
};

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrModal, setQrModal] = useState<{ address: string; asset: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    if (qrModal) {
      generateQR(qrModal.address);
    }
  }, [qrModal]);

  const fetchWallets = async () => {
    try {
      const response = await fetch("/api/wallets");
      const data = await response.json();
      if (data.success) {
        setWallets(data.data.wallets);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateWallets = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/wallets", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        await fetchWallets();
      }
    } catch (error) {
      console.error("Error generating wallets:", error);
    } finally {
      setGenerating(false);
    }
  };

  const generateQR = async (address: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(address, {
        width: 256,
        margin: 2,
        color: { dark: "#fafafa", light: "#070b14" },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR:", error);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Mis Wallets</h1>
          <p className="text-zinc-400 mt-1">
            Direcciones para recibir pagos en crypto
          </p>
        </div>
        {wallets.length === 0 && (
          <button
            onClick={generateWallets}
            disabled={generating}
            className="btn-primary !py-2 flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {generating ? "Generando..." : "Generar wallets"}
          </button>
        )}
      </div>

      {wallets.length === 0 ? (
        <div className="glass-card p-8 sm:p-12 text-center">
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-100 mb-2">
            No tienes wallets aún
          </h3>
          <p className="text-zinc-400 mb-6">
            Genera tus wallets para comenzar a recibir pagos en crypto
          </p>
          <button
            onClick={generateWallets}
            disabled={generating}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {generating ? "Generando..." : "Generar wallets"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="glass-card p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-10 w-10 rounded-xl ${
                    assetInfo[wallet.asset]?.color || "bg-zinc-500"
                  } flex items-center justify-center text-white font-bold text-sm`}
                >
                  {wallet.asset.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100">
                    {assetInfo[wallet.asset]?.name || wallet.asset}
                  </h3>
                  <p className="text-sm text-zinc-500">{wallet.network}</p>
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-3 sm:p-4 mb-4 border border-white/[0.06]">
                <p className="text-xs text-zinc-500 mb-1">Dirección de depósito</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm text-zinc-200 break-all flex-1 font-mono">
                    {wallet.address}
                  </code>
                  <button
                    onClick={() => copyAddress(wallet.address)}
                    className="p-2 hover:bg-white/[0.08] rounded-lg flex-shrink-0 transition-colors"
                    title="Copiar dirección"
                  >
                    {copied === wallet.address ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setQrModal({ address: wallet.address, asset: wallet.asset })
                    }
                    className="p-2 hover:bg-white/[0.08] rounded-lg flex-shrink-0 transition-colors"
                    title="Mostrar QR"
                  >
                    <QrCode className="h-4 w-4 text-zinc-400" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-zinc-500">Balance en wallet</p>
                  <p className="text-lg font-semibold text-zinc-100">
                    {parseFloat(wallet.balance).toFixed(2)}{" "}
                    {wallet.asset.split("_")[0]}
                  </p>
                </div>
                <a
                  href={`${assetInfo[wallet.asset]?.explorer || ""}${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs sm:text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Ver en explorer <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setQrModal(null)}
        >
          <div
            className="gradient-border-card max-w-sm w-full mx-4 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-zinc-100 mb-2 text-center">
                {assetInfo[qrModal.asset]?.name || qrModal.asset}
              </h3>
              <p className="text-sm text-zinc-500 mb-4 text-center">
                Escanea para depositar
              </p>
              <div className="bg-[#09090b] rounded-xl p-4 flex items-center justify-center border border-white/[0.06]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 sm:w-48 sm:h-48" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                )}
              </div>
              <p className="text-center text-[10px] sm:text-xs text-zinc-500 mt-4 font-mono break-all">
                {qrModal.address}
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => copyAddress(qrModal.address)}
                  className="btn-primary flex-1 !py-3 sm:!py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  {copied === qrModal.address ? (
                    <>
                      <Check className="h-4 w-4" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copiar
                    </>
                  )}
                </button>
                <button
                  onClick={() => setQrModal(null)}
                  className="btn-secondary flex-1 !py-3 sm:!py-2.5 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
