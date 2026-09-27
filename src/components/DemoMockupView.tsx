"use client";

import type { DemoMockup } from "@/lib/demo/types";

export function DemoMockupView({ demo }: { demo: DemoMockup }) {
  const p = demo.palette;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Así lo buscaría su cliente
        </p>
        <div
          className="mt-2 rounded-lg border border-border p-3 shadow-sm"
          style={{ background: "#f8f9fa" }}
        >
          <div
            className="flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm"
            style={{ borderColor: "#dfe1e5", color: "#202124" }}
          >
            <span style={{ color: "#9aa0a6" }}>⌕</span>
            <span className="truncate font-medium">{demo.search_query}</span>
          </div>
          <div className="mt-3">
            <p className="text-xs" style={{ color: "#202124" }}>
              www.ejemplo.local
            </p>
            <p
              className="text-base font-medium leading-snug"
              style={{ color: "#1a0dab" }}
            >
              {demo.search_title}
            </p>
            <p
              className="mt-0.5 text-sm leading-snug"
              style={{ color: "#4d5156" }}
            >
              {demo.search_snippet}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Así se vería / funcionaría
        </p>
        <div
          className="mt-2 overflow-hidden rounded-2xl border border-black/10 shadow-md"
          style={{ background: p.bg, color: p.text }}
        >
          <div className="flex justify-center bg-black/80 py-2">
            <div className="h-1.5 w-16 rounded-full bg-white/30" />
          </div>
          <div className="px-4 pb-5 pt-4" style={{ background: p.bg }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: p.muted }}
            >
              {demo.vibe}
            </p>
            <h3 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
              {demo.headline}
            </h3>
            <p className="mt-1 text-sm" style={{ color: p.muted }}>
              {demo.tagline}
            </p>

            <ul className="mt-4 flex flex-col gap-2">
              {demo.items.map((item) => (
                <li
                  key={item.name}
                  className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: p.surface }}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {item.name}
                    </span>
                    {item.note && (
                      <span className="block text-xs" style={{ color: p.muted }}>
                        {item.note}
                      </span>
                    )}
                  </span>
                  <span
                    className="shrink-0 text-sm font-bold"
                    style={{ color: p.accent }}
                  >
                    {item.price_hint}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(demo.cta_prefill)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white"
              style={{ background: p.accent }}
            >
              {demo.cta_label}
            </a>

            <ol className="mt-4 space-y-1.5">
              {demo.flow_steps.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-2 text-xs"
                  style={{ color: p.muted }}
                >
                  <span className="font-bold" style={{ color: p.accent }}>
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <p className="rounded-md bg-background px-3 py-2 text-xs text-muted">
        <span className="font-semibold text-foreground">Por qué esta demo: </span>
        {demo.why_this}
      </p>
    </div>
  );
}
