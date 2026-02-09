"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    rfc: "",
    phone: "",
    clabe: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          rfc: formData.rfc,
          phone: formData.phone,
          clabe: formData.clabe,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Error al registrar");
        return;
      }

      // Redirigir al login
      router.push("/login?registered=true");
    } catch (err) {
      setError("Error al procesar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="orb orb-purple w-[500px] h-[500px] -top-32 -left-32 animate-float-slow" />
      <div className="orb orb-amber w-[300px] h-[300px] -bottom-16 -right-16 animate-float" />

      <div className="max-w-lg w-full relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold gradient-text">
            NovaPay
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-zinc-100">
            Crear cuenta
          </h2>
          <p className="mt-2 text-zinc-400">
            Registra tu negocio para comenzar a aceptar pagos en crypto
          </p>
        </div>

        <div className="gradient-border-card">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Nombre del negocio
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="Mi Restaurante S.A. de C.V."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    RFC
                  </label>
                  <input
                    type="text"
                    name="rfc"
                    value={formData.rfc}
                    onChange={handleChange}
                    required
                    maxLength={13}
                    className="input-dark uppercase"
                    placeholder="XAXX010101000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="5512345678"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    CLABE Interbancaria
                  </label>
                  <input
                    type="text"
                    name="clabe"
                    value={formData.clabe}
                    onChange={handleChange}
                    required
                    maxLength={18}
                    className="input-dark"
                    placeholder="012345678901234567"
                  />
                  <p className="text-xs text-zinc-500 mt-1.5">
                    18 dígitos. Aquí recibirás tus retiros SPEI.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="contacto@minegocio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="input-dark"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="input-dark"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Registrando..." : "Crear cuenta"}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-400">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Inicia sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
