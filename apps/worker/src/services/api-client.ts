import { API_ENDPOINTS } from "@novapay/shared";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

type NotificationType =
  | "deposit-detected"
  | "deposit-confirmed"
  | "deposit-swept";

/**
 * Notifica a la API de Vercel sobre eventos
 */
export async function notifyApi(
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!INTERNAL_API_KEY) {
    console.warn("INTERNAL_API_KEY not set, skipping API notification");
    return false;
  }

  const endpoints: Record<NotificationType, string> = {
    "deposit-detected": API_ENDPOINTS.DEPOSIT_DETECTED,
    "deposit-confirmed": API_ENDPOINTS.DEPOSIT_CONFIRMED,
    "deposit-swept": API_ENDPOINTS.DEPOSIT_SWEPT,
  };

  const endpoint = endpoints[type];
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": INTERNAL_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API notification failed: ${response.status} - ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to notify API (${type}):`, error);
    return false;
  }
}

/**
 * Verifica la salud de la API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH_CHECK}`);
    return response.ok;
  } catch {
    return false;
  }
}
