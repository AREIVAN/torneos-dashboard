"use client";
/* eslint-disable react/no-children-prop */

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useRobotStore } from "@/store/useRobotStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const robotSchema = z.object({
  nombre: z.string().min(1, "Obligatorio").max(24, "Máximo 24 caracteres"),
  categoria: z.string().min(1, "Selecciona una categoría"),
  equipo: z.string().max(24),
  controlador: z.string().max(24),
  escuela: z.string().max(32),
  peso_g: z.number().int().min(0).optional(),
  dimensiones_mm: z.string().max(20).optional(),
  tipo_control: z.string().optional(),
  frecuencia_protocolo: z.string().max(24).optional(),
  contacto: z.string().max(40).optional(),
  inspeccion_estado: z.string().optional(),
  inspeccion_checklist: z.string().max(400).optional(),
  foto_url: z.string().max(200).optional(),
  logo_url: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof robotSchema>;

function formatFieldErrors(errors: unknown[] | undefined): string {
  if (!errors || errors.length === 0) return "";
  return errors
    .map((error) => {
      if (typeof error === "string") return error;
      if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        return typeof message === "string" ? message : "Valor inválido";
      }
      return "Valor inválido";
    })
    .join(", ");
}

export default function NewRobotPage() {
  const router = useRouter();
  const addMine = useRobotStore((state) => state.addMine);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
       toast.info(`Foto lista para subir: ${acceptedFiles[0].name}`);
       // form.setFieldValue('foto_url', ...)
    }
  });

  const form = useForm({
    defaultValues: {
      nombre: "",
      categoria: "",
      equipo: "",
      controlador: "",
      escuela: "",
      inspeccion_estado: "pendiente",
    } as FormValues,
    validators: {
      onChange: robotSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const { data: ridData, error: ridError } = await getSupabaseClient().rpc("reserve_robot_id");
        if (ridError || !ridData) throw new Error("No se pudo obtener el ID del robot");
        
        const robotId = String(ridData).padStart(4, "0");
        const qrLink = `${window.location.origin}/robots/${robotId}`;

        const { error } = await getSupabaseClient().from("robot_cards").insert([
          {
            robot_id: robotId,
            qr_link: qrLink,
            qr_offline: qrLink,
            data: {
              i: robotId,
              n: value.nombre,
              c: value.categoria,
              t: value.equipo,
              p: value.controlador,
              s: value.escuela,
              w: value.peso_g || null,
              d: value.dimensiones_mm || null,
              y: value.tipo_control || null,
              f: value.frecuencia_protocolo || null,
              k: value.contacto || null,
              a: value.inspeccion_estado || 'pendiente',
              q: qrLink,
              v: 1,
            },
          },
        ]);

        if (error) throw error;

        addMine(robotId);
        toast.success("Robot registrado exitosamente. ID: " + robotId);
        router.push(`/robots/${robotId}`);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message ?? "Intenta nuevamente")
            : "Intenta nuevamente";
        toast.error("Error al registrar: " + message);
      }
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-3.5 items-start">
      {/* LEFT PANEL */}
      <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
          <div className="flex flex-col gap-1">
            <Breadcrumbs items={[{ label: "Registrar Robot" }]} />
            <b className="text-lg tracking-wide text-brand-text">Nuevo Robot</b>
          </div>
          <div className="flex gap-2.5">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <button
                  type="button"
                  onClick={form.handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="border border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon2/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text px-3 py-2 rounded-xl font-extrabold tracking-wide hover:brightness-110 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Guardando..." : "Generar QR"}
                </button>
              )}
            />
          </div>
        </div>

        <div className="p-4">
          <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-3 mb-2.5">Básico</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-brand-muted/80 mb-1.5">Robot ID (único)</label>
              <input readOnly disabled placeholder="Asignado automáticamente" className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text/50 outline-none cursor-not-allowed" />
            </div>

            <form.Field
              name="nombre"
              children={(field) => (
                <div>
                  <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Nombre del robot</label>
                    <span className="text-[11px] text-brand-text/45">{field.state.value.length}/24</span>
                  </div>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. KRAKEN"
                    maxLength={24}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                  {field.state.meta.errors ? <p className="text-brand-hot text-[11px] mt-1.5">{formatFieldErrors(field.state.meta.errors)}</p> : null}
                </div>
              )}
            />

            <form.Field
              name="categoria"
              children={(field) => (
                <div>
                  <label className="block text-xs text-brand-muted/80 mb-1.5">Categoría</label>
                  <select
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all appearance-none"
                  >
                    <option value="">(selecciona)</option>
                    <option value="Mini Sumo">Mini Sumo</option>
                    <option value="Mini Sumo 500g">Mini Sumo 500g</option>
                    <option value="Sumo 3kg">Sumo 3kg</option>
                    <option value="Combate">Combate</option>
                    <option value="Seguidor de línea">Seguidor de línea</option>
                    <option value="Otro">Otro</option>
                  </select>
                  {field.state.meta.errors ? <p className="text-brand-hot text-[11px] mt-1.5">{formatFieldErrors(field.state.meta.errors)}</p> : null}
                </div>
              )}
            />

            <form.Field
              name="equipo"
              children={(field) => (
                <div>
                  <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Equipo</label>
                    <span className="text-[11px] text-brand-text/45">{field.state.value.length}/24</span>
                  </div>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. RoboDragons"
                    maxLength={24}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                </div>
              )}
            />

             <form.Field
              name="controlador"
              children={(field) => (
                <div>
                  <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Controlador / Piloto</label>
                    <span className="text-[11px] text-brand-text/45">{field.state.value.length}/24</span>
                  </div>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Nombre del piloto"
                    maxLength={24}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                </div>
              )}
            />

             <form.Field
              name="escuela"
              children={(field) => (
                <div>
                  <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Escuela</label>
                    <span className="text-[11px] text-brand-text/45">{field.state.value.length}/32</span>
                  </div>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. ESIME Azcapotzalco"
                    maxLength={32}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                </div>
              )}
            />

            <form.Field
              name="contacto"
              children={(field) => (
                <div>
                  <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Contacto</label>
                    <span className="text-[11px] text-brand-text/45">{(field.state.value || "").length}/40</span>
                  </div>
                  <input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="email@ejemplo.com o +52..."
                    maxLength={40}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                </div>
              )}
            />
          </div>
          
          <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-4 mb-2.5">Control y Comunicación</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            <form.Field
              name="tipo_control"
              children={(field) => (
                <div>
                  <label className="block text-xs text-brand-muted/80 mb-1.5">Tipo de Control</label>
                  <select
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all appearance-none"
                  >
                    <option value="">(selecciona)</option>
                    <option value="Remoto">Remoto</option>
                    <option value="Autónomo">Autónomo</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
              )}
            />

            <form.Field
              name="frecuencia_protocolo"
              children={(field) => (
                <div>
                   <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                    <label className="text-xs text-brand-muted/80">Frecuencia / Protocolo</label>
                    <span className="text-[11px] text-brand-text/45">{(field.state.value || "").length}/24</span>
                  </div>
                  <input
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Ej. 2.4GHz DSMX, 433MHz, BT"
                    maxLength={24}
                    className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                  />
                </div>
              )}
            />
          </div>
          
          <div className="text-brand-muted/80 text-xs tracking-wide uppercase mt-4 mb-2.5">Opcional</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opcional */}
               <form.Field
                name="peso_g"
                children={(field) => (
                  <div>
                    <label className="block text-xs text-brand-muted/80 mb-1.5">Peso (g)</label>
                    <input
                      type="number"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                      min={0}
                      placeholder="Ej. 498"
                      className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                    />
                  </div>
                )}
              />

              <form.Field
                name="dimensiones_mm"
                children={(field) => (
                  <div>
                     <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
                        <label className="text-xs text-brand-muted/80">Dimensiones (mm)</label>
                        <span className="text-[11px] text-brand-text/45">{field.state.value?.length || 0}/20</span>
                     </div>
                    <input
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ej. 100x100x55"
                      maxLength={20}
                      className="w-full px-3 py-3 rounded-xl border border-brand-stroke/20 bg-brand-bg/35 text-brand-text outline-none focus:border-brand-neon/35 focus:ring-1 focus:ring-[inset_0_0_0_1px_rgba(122, 63, 255,0.1)] transition-all"
                    />
                  </div>
                )}
              />

              <div className="sm:col-span-2">
                 <label className="block text-xs text-brand-muted/80 mb-1.5">Foto del Robot (Opcional)</label>
                 <div {...getRootProps()} className={`w-full p-6 rounded-xl border-2 border-dashed ${isDragActive ? 'border-brand-neon bg-brand-neon/10' : 'border-brand-stroke/40 bg-brand-bg/25'} text-center cursor-pointer transition-all hover:bg-brand-stroke/20`}>
                   <input {...getInputProps()} />
                   {isDragActive ? (
                     <p className="text-brand-neon text-sm font-bold">Suelta la imagen aquí...</p>
                   ) : (
                     <p className="text-brand-muted text-sm">Arrastra y suelta la foto del robot, o haz clic para seleccionar</p>
                   )}
                 </div>
              </div>
          </div>

          <p className="text-brand-muted/45 text-xs leading-relaxed mt-4">
            Nota: Al generar, se registra en la base de datos y se crea un link visual que funge como credencial del robot.
          </p>
        </div>
      </section>

      {/* RIGHT PANEL (QR Placeholder) */}
      <section className="bg-linear-to-b from-brand-panel/90 to-brand-panel2/70 border border-brand-stroke/35 shadow-[inset_0_0_0_1px_rgba(122, 63, 255,0.08),0_18px_60px_rgba(0,0,0,0.55)] rounded-[22px] overflow-hidden">
         <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5 border-b border-brand-stroke/25">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-sm tracking-wide uppercase text-brand-muted">Escanéalo con cámara</h2>
            <b className="text-lg tracking-wide text-brand-text">Robot QR</b>
          </div>
        </div>
        <div className="p-4">
           <div className="rounded-[18px] border border-brand-neon/20 bg-brand-bg/35 p-4 flex justify-center items-center min-h-[360px] opacity-50">
               Completa el formulario para generar QR
           </div>
        </div>
      </section>
    </div>
  );
}
