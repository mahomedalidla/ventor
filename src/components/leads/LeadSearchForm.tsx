"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_FORM_OPTIONS,
  resolvePlaybook,
} from "@/lib/categories/playbooks";
import { createClient } from "@/lib/supabase/client";
import type { ProspectedLead } from "@/lib/places/types";
import { parseDoctoraliaUrl, nombreFromDoctoraliaSlug } from "@/lib/doctoralia/parse-profile-url";
import { parseSocialProfileUrl } from "@/lib/social/parse-profile-url";
import { ZONA_GROUPS } from "@/lib/zones";

type Tab = "places" | "redes" | "doctoralia" | "manual";

export function LeadSearchForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("places");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Places (automático)
  const [categoria, setCategoria] = useState("mariscos");
  const [zona, setZona] = useState("Tepic");
  const [prospecting, setProspecting] = useState(false);
  const [prospected, setProspected] = useState<ProspectedLead[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const activePlaybook = useMemo(
    () => resolvePlaybook(categoria),
    [categoria],
  );

  // Redes
  const [perfilUrl, setPerfilUrl] = useState("");
  const [notaRed, setNotaRed] = useState("");
  const [nombreRed, setNombreRed] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [zonaRed, setZonaRed] = useState("Tepic");
  const [tipoRed, setTipoRed] = useState("");
  const [telefonoRed, setTelefonoRed] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Doctoralia
  const [docUrl, setDocUrl] = useState("");
  const [docNombre, setDocNombre] = useState("");
  const [docZona, setDocZona] = useState("Tepic");
  const [docTipo, setDocTipo] = useState("oftalmólogo");
  const [docTel, setDocTel] = useState("");
  const [docNota, setDocNota] = useState("");

  const parsed = useMemo(
    () => (perfilUrl ? parseSocialProfileUrl(perfilUrl) : null),
    [perfilUrl],
  );
  const parsedDoc = useMemo(
    () => (docUrl ? parseDoctoraliaUrl(docUrl) : null),
    [docUrl],
  );

  // Manual
  const [nombreManual, setNombreManual] = useState("");
  const [zonaManual, setZonaManual] = useState("Tepic");
  const [tipoManual, setTipoManual] = useState("");
  const [telefonoManual, setTelefonoManual] = useState("");
  const [notaManual, setNotaManual] = useState("");

  async function prospectPlaces() {
    setError(null);
    setStatus(null);
    setSummary(null);
    setProspected([]);
    setProspecting(true);
    try {
      const res = await fetch("/api/places/prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria, zona }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al prospectar");
        return;
      }
      setProspected(data.leads ?? []);
      const leadIds = (data.leads ?? [])
        .map((l: ProspectedLead) => l.lead_id)
        .filter(Boolean) as string[];

      let inferMsg = "";
      if (leadIds.length > 0) {
        setStatus("Generando oportunidades…");
        const inferRes = await fetch("/api/infer/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_ids: leadIds.slice(0, 10) }),
        });
        const inferData = await inferRes.json();
        if (inferRes.ok) {
          inferMsg = ` · ${inferData.inserted_total} oportunidades creadas`;
        } else {
          inferMsg = ` · inferencia: ${inferData.error ?? "falló"}`;
        }
      }

      setSummary(
        `"${data.query}"${data.zona_geo ? ` · geo ${data.zona_geo}` : ""} · playbook ${data.playbook_label} → ${data.created} nuevos, ${data.updated} actualizados, ${data.signals_created} señales${data.filtered_out ? `, ${data.filtered_out} fuera de zona` : ""}${inferMsg}.`,
      );
      if ((data.leads ?? []).length === 0) {
        setStatus("Sin resultados. Prueba otra categoría o zona.");
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el motor de prospección.");
    } finally {
      setProspecting(false);
    }
  }

  async function loadPreview() {
    if (!parsed) {
      setError("URL de perfil no válida (Instagram, Facebook o TikTok).");
      return;
    }
    setPreviewLoading(true);
    setPreviewHint(null);
    setError(null);
    try {
      const res = await fetch("/api/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsed.perfil_url }),
      });
      const data = await res.json();
      if (data.title && !nombreRed) setNombreRed(data.title);
      if (data.image) setPreviewImage(data.image);
      setPreviewHint(
        data.warning ??
          (data.description
            ? data.description.slice(0, 120)
            : "Vista previa lista"),
      );
    } catch {
      setPreviewHint("Sin vista previa; puedes escribir el nombre a mano.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveSocial() {
    if (!parsed) {
      setError("Pega un link válido de Instagram, Facebook o TikTok.");
      return;
    }
    if (!notaRed.trim()) {
      setError("Escribe por qué es un lead (una línea).");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const supabase = createClient();
    const nombre = nombreRed.trim() || `@${parsed.usuario_red_social}`;

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        origen: "redes_sociales",
        nombre,
        zona: zonaRed || null,
        tipo_negocio: tipoRed.trim() || null,
        telefono: telefonoRed.trim() || null,
        perfil_url: parsed.perfil_url,
        red_social: parsed.red_social,
        usuario_red_social: parsed.usuario_red_social,
        metadata: previewImage ? { og_image: previewImage } : {},
      })
      .select("id")
      .single();

    if (leadErr || !lead) {
      setError(leadErr?.message ?? "No se pudo guardar");
      setSaving(false);
      return;
    }

    await supabase.from("signals").insert({
      lead_id: lead.id,
      tipo_signal: "nota_vendedor",
      detalle: notaRed.trim(),
      detectado_por: "manual",
    });

    let inferMsg = "";
    try {
      setStatus("Generando oportunidades…");
      const inferRes = await fetch("/api/infer/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [lead.id] }),
      });
      const inferData = await inferRes.json();
      inferMsg = inferRes.ok
        ? ` · ${inferData.inserted_total ?? 0} oportunidades`
        : ` · inferencia: ${inferData.error ?? "falló"}`;
    } catch {
      inferMsg = " · inferencia: no se pudo conectar";
    }

    setStatus(`Lead de red social guardado${inferMsg}.`);
    setPerfilUrl("");
    setNotaRed("");
    setNombreRed("");
    setTipoRed("");
    setTelefonoRed("");
    setPreviewHint(null);
    setPreviewImage(null);
    setSaving(false);
    router.refresh();
  }

  async function saveDoctoralia() {
    if (!parsedDoc) {
      setError("Pega un link válido de Doctoralia (perfil del médico o clínica).");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/doctoralia/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: parsedDoc.perfil_url,
          nombre: docNombre.trim() || nombreFromDoctoraliaSlug(parsedDoc.slug),
          zona: docZona,
          tipo_negocio: docTipo.trim() || parsedDoc.especialidad_hint,
          telefono: docTel.trim() || null,
          nota: docNota.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      setStatus(data.mensaje ?? "Lead Doctoralia guardado.");
      setDocUrl("");
      setDocNombre("");
      setDocNota("");
      setDocTel("");
      router.refresh();
    } catch {
      setError("No se pudo conectar.");
    } finally {
      setSaving(false);
    }
  }

  async function saveManual() {
    if (!nombreManual.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const supabase = createClient();

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        origen: "manual",
        nombre: nombreManual.trim(),
        tipo_negocio: tipoManual.trim() || null,
        zona: zonaManual,
        telefono: telefonoManual.trim() || null,
        metadata: {},
      })
      .select("id")
      .single();

    if (leadErr || !lead) {
      setError(leadErr?.message ?? "No se pudo guardar");
      setSaving(false);
      return;
    }

    if (notaManual.trim()) {
      await supabase.from("signals").insert({
        lead_id: lead.id,
        tipo_signal: "nota_vendedor",
        detalle: notaManual.trim(),
        detectado_por: "manual",
      });
    }

    setStatus("Lead manual guardado.");
    setNombreManual("");
    setTipoManual("");
    setTelefonoManual("");
    setNotaManual("");
    setSaving(false);
    router.refresh();
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "places", label: "Google Places" },
    { id: "redes", label: "Redes" },
    { id: "doctoralia", label: "Doctoralia" },
    { id: "manual", label: "Manual" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
              setStatus(null);
            }}
            className={
              tab === t.id
                ? "shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
                : "shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted">
        App interna: reservado para fase posterior.
      </p>

      {tab === "places" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Un clic: busca, guarda y genera señales según el rubro. Hotelería ≠
            comida ≠ clínica — cada categoría cambia qué se busca y qué se
            vende.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
            >
              {Array.from(
                new Set(CATEGORY_FORM_OPTIONS.map((c) => c.group)),
              ).map((group) => (
                <optgroup key={group} label={group}>
                  {CATEGORY_FORM_OPTIONS.filter((c) => c.group === group).map(
                    (c) => (
                      <option key={c.value} value={c.value}>
                        {c.value}
                      </option>
                    ),
                  )}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-background px-3 py-2 text-xs text-muted">
            <p>
              <span className="font-semibold text-foreground">
                Playbook: {activePlaybook.label}
              </span>
              {" · "}
              mira {activePlaybook.critical_capabilities.join(", ")}
            </p>
            <p className="mt-1">{activePlaybook.pain_context}</p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Zona</span>
            <select
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
            >
              {ZONA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.zonas.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={prospectPlaces}
            disabled={prospecting}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {prospecting
              ? "Prospectando (Places + sitios)…"
              : "Prospectar automáticamente"}
          </button>

          {summary && (
            <p className="text-sm font-medium text-accent">{summary}</p>
          )}

          {prospected.length > 0 && (
            <ul className="mt-1 flex flex-col gap-2">
              {prospected.map((item) => (
                <li
                  key={item.place.google_place_id || item.place.nombre}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">
                      {item.place.nombre}
                    </p>
                    <span className="shrink-0 text-[11px] uppercase text-muted">
                      {item.action === "created"
                        ? "nuevo"
                        : item.action === "updated"
                          ? "actualizado"
                          : "omitido"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.place.direccion ?? "Sin dirección"}
                    {item.place.rating != null
                      ? ` · ★ ${item.place.rating} (${item.place.user_rating_count ?? 0})`
                      : ""}
                    {item.playbook_label ? ` · ${item.playbook_label}` : ""}
                  </p>
                  {item.signals.filter((s) => s.tipo_signal !== "playbook_categoria")
                    .length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {item.signals
                        .filter((s) => s.tipo_signal !== "playbook_categoria")
                        .map((s) => (
                        <li
                          key={s.tipo_signal}
                          className="rounded bg-background px-2 py-0.5 text-[11px] font-medium"
                          title={s.detalle}
                        >
                          {s.tipo_signal}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      Sin fricción digital fuerte detectada.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "redes" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Link del perfil</span>
            <input
              type="url"
              placeholder="https://instagram.com/negocio…"
              value={perfilUrl}
              onChange={(e) => setPerfilUrl(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>

          {parsed && (
            <p className="text-xs text-muted">
              Detectado:{" "}
              <span className="font-medium text-foreground">
                {parsed.red_social}
              </span>{" "}
              · @{parsed.usuario_red_social}
            </p>
          )}

          <button
            type="button"
            onClick={loadPreview}
            disabled={!parsed || previewLoading}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {previewLoading ? "Leyendo perfil…" : "Autocompletar nombre"}
          </button>

          {previewHint && <p className="text-xs text-muted">{previewHint}</p>}
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage}
              alt=""
              className="h-24 w-full rounded-md object-cover"
            />
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre del negocio</span>
            <input
              value={nombreRed}
              onChange={(e) => setNombreRed(e.target.value)}
              placeholder="Se llena con la vista previa o a mano"
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Zona</span>
            <select
              value={zonaRed}
              onChange={(e) => setZonaRed(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
            >
              {ZONA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.zonas.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Tipo de negocio</span>
            <input
              list="rs-tipos"
              value={tipoRed}
              onChange={(e) => setTipoRed(e.target.value)}
              placeholder="Ej. oftalmólogo, mariscos, hotel…"
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
            <datalist id="rs-tipos">
              {CATEGORY_FORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.group}
                </option>
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Teléfono (opcional)</span>
            <input
              value={telefonoRed}
              onChange={(e) => setTelefonoRed(e.target.value)}
              placeholder="311 123 4567"
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">¿Por qué es un lead?</span>
            <textarea
              rows={2}
              value={notaRed}
              onChange={(e) => setNotaRed(e.target.value)}
              placeholder="Ej. publica seguido, buen engagement, no tiene link de pedidos en bio"
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>

          <button
            type="button"
            onClick={saveSocial}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar lead"}
          </button>
        </div>
      )}

      {tab === "doctoralia" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Pega el perfil del médico o clínica en Doctoralia. No scrapemos el
            directorio: enlazamos a Google Places para fotos legales.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Link del perfil</span>
            <input
              type="url"
              placeholder="https://www.doctoralia.com.mx/medico/…"
              value={docUrl}
              onChange={(e) => {
                setDocUrl(e.target.value);
                const p = parseDoctoraliaUrl(e.target.value);
                if (p && !docNombre) setDocNombre(nombreFromDoctoraliaSlug(p.slug));
                if (p?.especialidad_hint && !docTipo) setDocTipo(p.especialidad_hint);
              }}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          {parsedDoc && (
            <p className="text-xs text-muted">
              Detectado: <span className="font-medium text-foreground">{parsedDoc.slug}</span>
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre</span>
            <input
              value={docNombre}
              onChange={(e) => setDocNombre(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Zona</span>
            <select
              value={docZona}
              onChange={(e) => setDocZona(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
            >
              {ZONA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.zonas.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Especialidad / tipo</span>
            <input
              list="doc-tipos"
              value={docTipo}
              onChange={(e) => setDocTipo(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
            <datalist id="doc-tipos">
              {CATEGORY_FORM_OPTIONS.filter((o) => o.group === "Especialistas" || o.group === "Salud").map(
                (o) => (
                  <option key={o.value} value={o.value} />
                ),
              )}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Teléfono (opcional)</span>
            <input
              value={docTel}
              onChange={(e) => setDocTel(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nota (opcional)</span>
            <textarea
              rows={2}
              value={docNota}
              onChange={(e) => setDocNota(e.target.value)}
              placeholder="Ej. sin agenda online, buenas reseñas"
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={saveDoctoralia}
            disabled={saving || !parsedDoc}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar lead Doctoralia"}
          </button>
        </div>
      )}

      {tab === "manual" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre</span>
            <input
              value={nombreManual}
              onChange={(e) => setNombreManual(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Zona</span>
            <select
              value={zonaManual}
              onChange={(e) => setZonaManual(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
            >
              {ZONA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.zonas.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Tipo de negocio</span>
            <input
              value={tipoManual}
              onChange={(e) => setTipoManual(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Teléfono (opcional)</span>
            <input
              value={telefonoManual}
              onChange={(e) => setTelefonoManual(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nota / señal (opcional)</span>
            <textarea
              rows={2}
              value={notaManual}
              onChange={(e) => setNotaManual(e.target.value)}
              className="rounded-md border border-border px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={saveManual}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar lead"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm text-accent" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
