import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovaPay - Crypto Payment Gateway",
  description: "Acepta pagos en criptomonedas, recibe pesos mexicanos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={jetbrainsMono.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
