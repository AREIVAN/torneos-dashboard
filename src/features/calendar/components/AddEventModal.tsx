"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createEvent, type CreateEventInput } from "../api/createEvent";

const ADMIN_KEY = "areivan";

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  start_at: string;
  end_at: string;
  timezone: string;
  venue: string;
  city: string;
  address: string;
  categories: string;
  tags: string;
  poster_url: string;
  official_url: string;
  registration_url: string;
  rules_url: string;
  contact_email: string;
  contact_phone: string;
  fee: string;
  description: string;
  is_public: boolean;
}

const initialFormData: FormData = {
  name: "",
  start_at: "",
  end_at: "",
  timezone: "America/Mexico_City",
  venue: "",
  city: "",
  address: "",
  categories: "",
  tags: "",
  poster_url: "",
  official_url: "",
  registration_url: "",
  rules_url: "",
  contact_email: "",
  contact_phone: "",
  fee: "",
  description: "",
  is_public: true,
};

export function AddEventModal({ open, onClose, onSuccess }: AddEventModalProps) {
  const [step, setStep] = useState<"auth" | "form">("auth");
  const [secretKey, setSecretKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleVerifyKey = () => {
    if (secretKey === ADMIN_KEY) {
      setStep("form");
      setAuthError("");
    } else {
      setAuthError("Clave incorrecta");
    }
  };

  const handleClose = () => {
    setStep("auth");
    setSecretKey("");
    setAuthError("");
    setFormData(initialFormData);
    setSaveError("");
    onClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const parseCommaSeparated = (value: string): string[] | null => {
    if (!value.trim()) return null;
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    // Convert datetime-local to ISO string with timezone
    const formatDateTime = (dt: string): string | null => {
      if (!dt) return null;
      // datetime-local format: "2026-11-03T10:00"
      // We need to add the timezone offset for Mexico City
      return new Date(dt).toISOString();
    };

    const input: CreateEventInput = {
      name: formData.name,
      start_at: formatDateTime(formData.start_at) || "",
      end_at: formatDateTime(formData.end_at),
      timezone: formData.timezone || "America/Mexico_City",
      venue: formData.venue || null,
      city: formData.city || null,
      address: formData.address || null,
      categories: parseCommaSeparated(formData.categories),
      tags: parseCommaSeparated(formData.tags),
      poster_url: formData.poster_url || null,
      official_url: formData.official_url || null,
      registration_url: formData.registration_url || null,
      rules_url: formData.rules_url || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      fee: formData.fee || null,
      description: formData.description || null,
      is_public: formData.is_public,
    };

    const result = await createEvent(input);

    if (result.success) {
      handleClose();
      onSuccess();
    } else {
      setSaveError(result.error || "Error al guardar el evento");
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="!max-w-2xl !bg-brand-panel border-brand-stroke/40 text-brand-text max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-brand-text text-lg">
            Agregar Evento
          </DialogTitle>
        </DialogHeader>

        {step === "auth" ? (
          <div className="py-6 px-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="secretKey" className="text-brand-muted">
                  Ingresa la clave de administrador
                </Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyKey()}
                  placeholder="Clave secreta..."
                  className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                />
                {authError && (
                  <span className="text-red-400 text-sm">{authError}</span>
                )}
              </div>
              <Button
                onClick={handleVerifyKey}
                className="w-full bg-brand-neon/20 border border-brand-neon/40 text-brand-text hover:bg-brand-neon/30"
              >
                Verificar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-2 py-2 max-h-[60vh] space-y-4 custom-scroll">
              {/* Información básica */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Información básica
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name" className="text-brand-muted text-xs">
                      Nombre del torneo *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="XMAS ROBOTICS 2026"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="start_at" className="text-brand-muted text-xs">
                      Fecha/Hora inicio *
                    </Label>
                    <Input
                      id="start_at"
                      name="start_at"
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={handleInputChange}
                      required
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="end_at" className="text-brand-muted text-xs">
                      Fecha/Hora fin
                    </Label>
                    <Input
                      id="end_at"
                      name="end_at"
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={handleInputChange}
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Ubicación
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="venue" className="text-brand-muted text-xs">
                      Sede
                    </Label>
                    <Input
                      id="venue"
                      name="venue"
                      value={formData.venue}
                      onChange={handleInputChange}
                      placeholder="ESIME Azcapotzalco"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="city" className="text-brand-muted text-xs">
                      Ciudad
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="CDMX"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address" className="text-brand-muted text-xs">
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Av. de las Granjas 682, Col. Santa Catarina"
                    className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                  />
                </div>
              </div>

              {/* Categorías y Tags */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Categorías y Tags
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="categories" className="text-brand-muted text-xs">
                      Categorías (separadas por coma)
                    </Label>
                    <Input
                      id="categories"
                      name="categories"
                      value={formData.categories}
                      onChange={handleInputChange}
                      placeholder="Mini Sumo, Sumo RC, Line Follower"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tags" className="text-brand-muted text-xs">
                      Tags (separados por coma)
                    </Label>
                    <Input
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="autonomo, pro, principiantes"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
              </div>

              {/* URLs */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Enlaces
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="poster_url" className="text-brand-muted text-xs">
                      URL del Poster
                    </Label>
                    <Input
                      id="poster_url"
                      name="poster_url"
                      type="url"
                      value={formData.poster_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="official_url" className="text-brand-muted text-xs">
                      Página oficial
                    </Label>
                    <Input
                      id="official_url"
                      name="official_url"
                      type="url"
                      value={formData.official_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="registration_url" className="text-brand-muted text-xs">
                      URL de Registro
                    </Label>
                    <Input
                      id="registration_url"
                      name="registration_url"
                      type="url"
                      value={formData.registration_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rules_url" className="text-brand-muted text-xs">
                      URL de Reglas
                    </Label>
                    <Input
                      id="rules_url"
                      name="rules_url"
                      type="url"
                      value={formData.rules_url}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Contacto
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact_email" className="text-brand-muted text-xs">
                      Email de contacto
                    </Label>
                    <Input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      placeholder="info@evento.com"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact_phone" className="text-brand-muted text-xs">
                      Teléfono
                    </Label>
                    <Input
                      id="contact_phone"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="+52 55 1234 5678"
                      className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fee" className="text-brand-muted text-xs">
                    Costo de inscripción
                  </Label>
                  <Input
                    id="fee"
                    name="fee"
                    value={formData.fee}
                    onChange={handleInputChange}
                    placeholder="$250 MXN"
                    className="bg-brand-bg/50 border-brand-stroke/30 text-brand-text"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Descripción
                </h3>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description" className="text-brand-muted text-xs">
                    Descripción del evento
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Torneo anual de robótica con múltiples categorías..."
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-brand-stroke/30 bg-brand-bg/50 text-brand-text text-sm resize-none outline-none focus:border-brand-neon/40"
                  />
                </div>
              </div>

              {/* Opciones */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-wide border-b border-brand-stroke/20 pb-1">
                  Opciones
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_public"
                    checked={formData.is_public}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-stroke/30 bg-brand-bg/50 accent-brand-neon"
                  />
                  <span className="text-brand-text text-sm">Evento público (visible para todos)</span>
                </label>
              </div>

              {saveError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {saveError}
                </div>
              )}
            </div>

            <DialogFooter className="!bg-brand-panel2/50 border-brand-stroke/20">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-brand-stroke/30 text-brand-muted hover:text-brand-text"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-neon/20 border border-brand-neon/40 text-brand-text hover:bg-brand-neon/30"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
