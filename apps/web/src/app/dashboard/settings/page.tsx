"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { isValidClabe } from "@novapay/shared";

interface Merchant {
  id: string;
  email: string;
  businessName: string;
  rfc: string;
  phone: string;
  clabe: string;
  spreadPercent: string;
  autoSpeiEnabled: boolean;
  status: string;
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    phone: "",
    clabe: "",
    autoSpeiEnabled: false,
  });

  useEffect(() => {
    fetchMerchant();
  }, []);

  const fetchMerchant = async () => {
    try {
      const response = await fetch("/api/merchants/me");
      const data = await response.json();
      if (data.success) {
        setMerchant(data.data.merchant);
        setFormData({
          phone: data.data.merchant.phone,
          clabe: data.data.merchant.clabe,
          autoSpeiEnabled: data.data.merchant.autoSpeiEnabled,
        });
      }
    } catch (error) {
      console.error("Error fetching merchant:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validar CLABE
    if (!isValidClabe(formData.clabe)) {
      setError("CLABE inválida. Verifica los 18 dígitos.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Error al guardar");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">
          Ajusta los parámetros de tu cuenta
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Info de cuenta (solo lectura) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información de la cuenta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Nombre del negocio
              </label>
              <p className="text-gray-900">{merchant?.businessName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                RFC
              </label>
              <p className="text-gray-900 font-mono">{merchant?.rfc}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email
              </label>
              <p className="text-gray-900">{merchant?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Spread / Comisión
              </label>
              <p className="text-gray-900">{merchant?.spreadPercent}%</p>
            </div>
          </div>
        </div>

        {/* Formulario editable */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Datos editables
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Cambios guardados correctamente
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="5512345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CLABE Interbancaria
              </label>
              <input
                type="text"
                value={formData.clabe}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, clabe: e.target.value }))
                }
                maxLength={18}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                placeholder="012345678901234567"
              />
              <p className="text-xs text-gray-500 mt-1">
                Esta CLABE se usará para todos tus retiros SPEI
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    SPEI Automático
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Envía automáticamente cada depósito acreditado a tu cuenta bancaria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      autoSpeiEnabled: !prev.autoSpeiEnabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.autoSpeiEnabled ? "bg-primary-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.autoSpeiEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        {/* API Keys section (placeholder) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            API Keys
          </h2>
          <p className="text-gray-600 text-sm">
            Las API keys te permiten integrar NovaPay directamente en tu sistema.
            Esta funcionalidad estará disponible próximamente.
          </p>
          <button
            disabled
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
          >
            Generar API Key (Próximamente)
          </button>
        </div>
      </div>
    </div>
  );
}
