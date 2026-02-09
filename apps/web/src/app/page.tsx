import Link from "next/link";
import { ArrowRight, Shield, Zap, DollarSign, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="orb orb-purple w-[600px] h-[600px] -top-48 -left-48 animate-float-slow" />
      <div className="orb orb-amber w-[400px] h-[400px] top-1/3 -right-32 animate-float" />
      <div className="orb orb-pink w-[300px] h-[300px] bottom-0 left-1/4 animate-float-slower" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/[0.06]">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold gradient-text">
                NovaPay
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="btn-primary !py-2 !px-4 text-sm"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
          <div className="text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm text-zinc-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-glow" />
              Gateway de pagos crypto para México
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
              <span className="text-zinc-100">Acepta </span>
              <span className="gradient-text-hero">cripto</span>
              <span className="text-zinc-100">,</span>
              <br />
              <span className="text-zinc-100">recibe </span>
              <span className="gradient-text-hero">pesos</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl leading-relaxed text-zinc-400 max-w-2xl mx-auto">
              La forma más fácil de aceptar pagos en criptomonedas para tu
              negocio en México. Recibe USDT, ETH o BTC y obtén pesos mexicanos
              automáticamente en tu cuenta.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn-primary flex items-center gap-2 text-lg"
              >
                Comenzar ahora <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="btn-secondary flex items-center gap-2"
              >
                Ya tengo cuenta <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="relative py-32 border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100">
                Todo lo que necesitas
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Infraestructura confiable para tu negocio
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="gradient-border-card">
                <div className="p-8 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-6">
                    <Zap className="h-7 w-7 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Conversión automática
                  </h3>
                  <p className="mt-3 text-zinc-400 leading-relaxed">
                    Tus pagos en crypto se convierten automáticamente a pesos
                    mexicanos al mejor tipo de cambio.
                  </p>
                </div>
              </div>

              <div className="gradient-border-card">
                <div className="p-8 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-6">
                    <DollarSign className="h-7 w-7 text-accent-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Retiros SPEI
                  </h3>
                  <p className="mt-3 text-zinc-400 leading-relaxed">
                    Retira tu saldo en pesos cuando quieras directo a tu cuenta
                    bancaria vía SPEI.
                  </p>
                </div>
              </div>

              <div className="gradient-border-card">
                <div className="p-8 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-6">
                    <Shield className="h-7 w-7 text-pink-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Seguro y confiable
                  </h3>
                  <p className="mt-3 text-zinc-400 leading-relaxed">
                    Wallets dedicadas para tu negocio con claves encriptadas y
                    monitoreo 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="relative py-24 border-t border-white/[0.06]">
          <div className="orb orb-purple w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100">
              ¿Listo para aceptar pagos en crypto?
            </h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
              Regístrate en minutos y comienza a recibir pagos hoy mismo.
            </p>
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-2 mt-10 text-lg"
            >
              Crear cuenta gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm font-semibold gradient-text">NovaPay</span>
            <p className="text-sm text-zinc-500">
              © 2024 NovaPay. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
