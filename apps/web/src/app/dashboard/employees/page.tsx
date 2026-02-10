"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Plus,
  Loader2,
  X,
  Pencil,
  UserCheck,
  UserX,
  Key,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: "CASHIER" | "MANAGER";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState<"CASHIER" | "MANAGER">("CASHIER");

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormPin("");
    setFormRole("CASHIER");
    setError("");
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormName(emp.name);
    setFormPin("");
    setFormRole(emp.role);
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("Nombre requerido");
      return;
    }
    if (!editingId && !formPin) {
      setError("PIN requerido");
      return;
    }
    if (formPin && (formPin.length < 4 || formPin.length > 6 || !/^\d+$/.test(formPin))) {
      setError("PIN debe ser 4-6 dígitos numéricos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        const body: Record<string, any> = { name: formName, role: formRole };
        if (formPin) body.pin = formPin;

        const res = await fetch(`/api/employees/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message || "Error al actualizar");
          return;
        }
      } else {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, pin: formPin, role: formRole }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message || "Error al crear");
          return;
        }
      }
      setShowModal(false);
      fetchEmployees();
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      }
    } catch (e) {
      // silent
    }
  };

  const loginUrl = typeof window !== "undefined"
    ? `${window.location.origin}/employee-login?merchant=${session?.user?.id}`
    : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (session?.user?.employeeId) {
    return (
      <div className="text-center text-zinc-400 py-20">
        No tienes acceso a esta sección.
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <Users className="h-6 w-6 text-primary-400" />
          Empleados
        </h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {/* Link para empleados */}
      {employees.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
            <LinkIcon className="h-3.5 w-3.5" /> Link de acceso para empleados
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={loginUrl}
              className="input-dark text-xs flex-1 font-mono"
            />
            <button onClick={copyLink} className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors">
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">No tienes empleados</p>
          <p className="text-sm text-zinc-500 mb-4">
            Agrega empleados para que puedan cobrar con su propio PIN.
          </p>
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="h-4 w-4 inline mr-1" /> Agregar empleado
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    emp.isActive
                      ? "bg-primary-500/10 text-primary-300"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-medium ${emp.isActive ? "text-zinc-100" : "text-zinc-500"}`}>
                    {emp.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {emp.role === "MANAGER" ? "Manager" : "Cajero"}{" "}
                    {!emp.isActive && (
                      <span className="text-red-400/80">&middot; Inactivo</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(emp)}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] rounded-lg transition-all"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(emp)}
                  className={`p-2 rounded-lg transition-all ${
                    emp.isActive
                      ? "text-red-400 hover:bg-red-500/10"
                      : "text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                  title={emp.isActive ? "Desactivar" : "Activar"}
                >
                  {emp.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-zinc-100">
                {editingId ? "Editar empleado" : "Nuevo empleado"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nombre del empleado"
                  className="input-dark w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1">
                  <Key className="h-3 w-3" /> PIN (4-6 dígitos)
                  {editingId && <span className="text-zinc-600"> - dejar vacío para no cambiar</span>}
                </label>
                <input
                  type="password"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={editingId ? "****" : "1234"}
                  className="input-dark w-full tracking-widest"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Rol</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormRole("CASHIER")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      formRole === "CASHIER"
                        ? "bg-primary-500/20 border-primary-500/30 text-primary-300"
                        : "bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:bg-white/[0.08]"
                    }`}
                  >
                    Cajero
                  </button>
                  <button
                    onClick={() => setFormRole("MANAGER")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      formRole === "MANAGER"
                        ? "bg-primary-500/20 border-primary-500/30 text-primary-300"
                        : "bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:bg-white/[0.08]"
                    }`}
                  >
                    Manager
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Cajero: solo cobrar. Manager: cobrar + ver historial de todos.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full !py-3 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Guardar cambios"
                ) : (
                  "Crear empleado"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
