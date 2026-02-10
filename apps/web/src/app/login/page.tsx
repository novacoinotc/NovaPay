"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="orb orb-purple w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] -top-32 -right-32 animate-float-slow" />
      <div className="orb orb-pink hidden sm:block w-[300px] h-[300px] bottom-0 -left-16 animate-float" />

      <div className="max-w-[90vw] sm:max-w-md w-full relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold gradient-text">
            NovaPay
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-zinc-100">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-zinc-400">
            Accede a tu cuenta para gestionar tus pagos
          </p>
        </div>

        <div className="gradient-border-card">
          <div className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-300 mb-1.5"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-dark"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-400">
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Regístrate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
