import Link from "next/link";
import { ArrowRight, Shield, Zap, DollarSign } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">
                NovaPay
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Acepta <span className="text-primary-600">cripto</span>,
              <br />
              recibe <span className="text-green-600">pesos</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              La forma más fácil de aceptar pagos en criptomonedas para tu
              negocio en México. Recibe USDT, ETH o BTC y obtén pesos mexicanos
              automáticamente en tu cuenta.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/register"
                className="rounded-lg bg-primary-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-primary-700 flex items-center gap-2"
              >
                Comenzar ahora <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Conversión automática
                </h3>
                <p className="mt-2 text-gray-600">
                  Tus pagos en crypto se convierten automáticamente a pesos
                  mexicanos al mejor tipo de cambio.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Retiros SPEI
                </h3>
                <p className="mt-2 text-gray-600">
                  Retira tu saldo en pesos cuando quieras directo a tu cuenta
                  bancaria vía SPEI.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Seguro y confiable
                </h3>
                <p className="mt-2 text-gray-600">
                  Wallets dedicadas para tu negocio con claves encriptadas y
                  monitoreo 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary-600 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white">
              ¿Listo para aceptar pagos en crypto?
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              Regístrate en minutos y comienza a recibir pagos hoy mismo.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-lg font-semibold text-primary-600 hover:bg-gray-100"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400">
            © 2024 NovaPay. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
