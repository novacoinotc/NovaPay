import "dotenv/config";
import { BUSINESS_RULES } from "@novapay/shared";
import { WalletMonitor } from "./monitors/wallet-monitor";
import { SweepProcessor } from "./processors/sweep-processor";
import { PriceUpdater } from "./services/price-updater";
import { delay } from "@novapay/shared";

console.log("===========================================");
console.log("  NovaPay Worker - Blockchain Monitor");
console.log("===========================================");
console.log(`Started at: ${new Date().toISOString()}`);
console.log(`Poll interval: ${BUSINESS_RULES.WALLET_POLL_INTERVAL_MS}ms`);
console.log();

// Servicios
const walletMonitor = new WalletMonitor();
const sweepProcessor = new SweepProcessor();
const priceUpdater = new PriceUpdater();

// Estado del worker
let isRunning = true;

// Manejo de señales para shutdown graceful
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  isRunning = false;
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  isRunning = false;
});

/**
 * Loop principal del worker
 */
async function mainLoop() {
  while (isRunning) {
    try {
      const startTime = Date.now();

      // 1. Actualizar precios (cada 30 segundos)
      await priceUpdater.updateIfNeeded();

      // 2. Monitorear wallets por nuevos depósitos
      await walletMonitor.checkAllWallets();

      // 3. Procesar sweeps pendientes
      await sweepProcessor.processPendingSweeps();

      // Calcular tiempo de espera
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(
        0,
        BUSINESS_RULES.WALLET_POLL_INTERVAL_MS - elapsed
      );

      if (waitTime > 0) {
        await delay(waitTime);
      }
    } catch (error) {
      console.error("Error in main loop:", error);
      // Esperar un poco antes de reintentar en caso de error
      await delay(5000);
    }
  }

  console.log("Worker stopped.");
  process.exit(0);
}

// Iniciar el loop principal
mainLoop().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
