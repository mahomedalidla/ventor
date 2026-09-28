"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    search.get("razon") === "no_invitado"
      ? "Esa cuenta no está invitada. Pide acceso al dueño del sistema."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else window.location.href = "/";
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        Vendor
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Inteligencia de ventas
      </h1>
      <p className="mt-2 text-sm text-muted">
        Acceso solo para el equipo. No se pueden crear cuentas desde aquí.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Contraseña</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {loading ? "Espera…" : "Entrar"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-1 items-center justify-center px-4 py-10 text-sm text-muted">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
