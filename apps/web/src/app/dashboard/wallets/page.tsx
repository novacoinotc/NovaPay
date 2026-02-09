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
    color: "bg-green-500",
    explorer: "https://tronscan.org/#/address/",
  },
  USDT_ERC20: {
    name: "USDT (ERC20)",
    color: "bg-blue-500",
    explorer: "https://etherscan.io/address/",
  },
  ETH: {
    name: "Ethereum",
    color: "bg-purple-500",
    explorer: "https://etherscan.io/address/",
  },
  BTC: {
    name: "Bitcoin",
    color: "bg-orange-500",
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
        color: { dark: "#e2e8f0", light: "#0a0a0f" },
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mis Wallets</h1>
          <p className="text-slate-400 mt-1">
            Direcciones para recibir pagos en crypto
          </p>
        </div>
        {wallets.length === 0 && (
          <button
            onClick={generateWallets}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-glow"
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
        <div className="glass-card p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-100 mb-2">
            No tienes wallets aún
          </h3>
          <p className="text-slate-400 mb-6">
            Genera tus wallets para comenzar a recibir pagos en crypto
          </p>
          <button
            onClick={generateWallets}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-glow"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-10 w-10 rounded-full ${
                    assetInfo[wallet.asset]?.color || "bg-gray-500"
                  } flex items-center justify-center text-white font-bold text-sm`}
                >
                  {wallet.asset.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">
                    {assetInfo[wallet.asset]?.name || wallet.asset}
                  </h3>
                  <p className="text-sm text-slate-500">{wallet.network}</p>
                </div>
              </div>

              <div className="bg-white/[0.05] rounded-lg p-4 mb-4 border border-white/[0.08]">
                <p className="text-xs text-slate-500 mb-1">Dirección de depósito</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-slate-200 break-all flex-1 font-mono">
                    {wallet.address}
                  </code>
                  <button
                    onClick={() => copyAddress(wallet.address)}
                    className="p-2 hover:bg-white/[0.1] rounded-lg flex-shrink-0"
                    title="Copiar dirección"
                  >
                    {copied === wallet.address ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setQrModal({ address: wallet.address, asset: wallet.asset })
                    }
                    className="p-2 hover:bg-white/[0.1] rounded-lg flex-shrink-0"
                    title="Mostrar QR"
                  >
                    <QrCode className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500">Balance en wallet</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {parseFloat(wallet.balance).toFixed(2)}{" "}
                    {wallet.asset.split("_")[0]}
                  </p>
                </div>
                <a
                  href={`${assetInfo[wallet.asset]?.explorer || ""}${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Ver en explorer <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-[#0f0f17] border border-white/[0.1] rounded-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100 mb-2 text-center">
              {assetInfo[qrModal.asset]?.name || qrModal.asset}
            </h3>
            <p className="text-sm text-slate-500 mb-4 text-center">
              Escanea para depositar
            </p>
            <div className="bg-[#0a0a0f] rounded-lg p-4 flex items-center justify-center border border-white/[0.08]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              )}
            </div>
            <p className="text-center text-xs text-slate-500 mt-4 font-mono break-all">
              {qrModal.address}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => copyAddress(qrModal.address)}
                className="flex-1 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 flex items-center justify-center gap-2"
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
                className="flex-1 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg hover:bg-white/[0.1] text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
