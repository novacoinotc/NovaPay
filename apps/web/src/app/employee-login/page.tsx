"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Delete } from "lucide-react";

function EmployeeLoginForm() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchant") || "";
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("PIN mínimo 4 dígitos");
      return;
    }

    if (!merchantId) {
      setError("Link inválido. Pide un nuevo link al dueño.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("employee-pin", {
        merchantId,
        pin,
        redirect: false,
      });

      if (result?.error) {
        setError("PIN inválido");
        setPin("");
      } else {
        window.location.href = "/dashboard/cobrar";
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="glass-card p-6">
        {/* PIN dots display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? "bg-primary-400 border-primary-400 scale-110"
                  : "border-zinc-600"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={loading}
              className="h-14 rounded-xl text-xl font-semibold text-zinc-100 bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.16] border border-white/[0.06] transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-14 rounded-xl text-zinc-400 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all flex items-center justify-center"
          >
            <Delete className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="h-14 rounded-xl text-xl font-semibold text-zinc-100 bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.16] border border-white/[0.06] transition-all"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
            className="h-14 rounded-xl text-sm font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 transition-all disabled:opacity-40 flex items-center justify-center"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "OK"}
          </button>
        </div>
      </div>

      {!merchantId && (
        <p className="text-xs text-red-400/80 text-center mt-4">
          Link incompleto. Solicita el enlace correcto al dueño del negocio.
        </p>
      )}
    </>
  );
}

export default function EmployeeLoginPage() {
  return (
    <div className="min-h-screen bg-[#050508] bg-grid flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">NovaPay</h1>
          <p className="text-sm text-zinc-400">Ingresa tu PIN para continuar</p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          }
        >
          <EmployeeLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
