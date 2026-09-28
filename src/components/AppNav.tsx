"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Oportunidades" },
  { href: "/leads/nuevo", label: "Nuevo lead" },
  { href: "/resultados", label: "Resultados" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/aprendizajes", label: "Aprendizajes" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Vendor
          </p>
          <nav className="mt-1 flex gap-3 overflow-x-auto whitespace-nowrap text-sm font-semibold">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "text-accent underline decoration-2 underline-offset-4"
                      : "text-foreground"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={signOut}
            className="text-xs font-medium text-muted underline-offset-2 hover:underline"
          >
            Salir
          </button>
          {/* Entrada discreta a limpieza de BD (etapa de pruebas) */}
          <Link
            href="/limpiar"
            className="text-[10px] text-muted/50 hover:text-muted"
            title="Mantenimiento"
          >
            ·
          </Link>
        </div>
      </div>
    </header>
  );
}
