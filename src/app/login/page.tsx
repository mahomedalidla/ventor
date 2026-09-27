"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/";
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Cuenta creada. Si pide confirmación, revisa tu correo.");
    }
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
        Entra para ver oportunidades de prospección local.
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
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
          {loading ? "Espera…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-muted" role="status">
          {message}
        </p>
      )}

      <button
        type="button"
        className="mt-6 text-left text-sm text-muted underline-offset-2 hover:underline"
        onClick={() =>
          setMode((m) => (m === "signin" ? "signup" : "signin"))
        }
      >
        {mode === "signin"
          ? "¿Primera vez? Crear cuenta"
          : "¿Ya tienes cuenta? Entrar"}
      </button>
    </div>
  );
}
