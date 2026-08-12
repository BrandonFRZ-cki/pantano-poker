"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { joinTournamentByCode } from "@/lib/tournaments";

function UnirseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, profile, loading } = useAuth();

  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    setError(null);
    try {
      const tournamentId = await joinTournamentByCode(code, profile);
      router.push(`/torneo/${tournamentId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo unir al torneo. Inténtalo de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !firebaseUser || !profile) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-6">
      <h1 className="font-display text-2xl text-pp-green-dark">
        Unirse a un torneo
      </h1>
      <p className="max-w-sm text-pp-brown/80">
        Pídele el código al dealer, o abre el link que te compartió.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          maxLength={6}
          className="rounded-full border border-pp-green-mid/40 bg-white px-5 py-3 text-center tracking-widest font-mono text-pp-brown outline-none focus:border-pp-green-dark"
        />
        <button
          type="submit"
          disabled={submitting || code.trim().length === 0}
          className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors disabled:opacity-50"
        >
          {submitting ? "Uniéndote…" : "Entrar al torneo"}
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function UnirseTorneoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
          <p className="text-pp-brown/70">Cargando…</p>
        </div>
      }
    >
      <UnirseForm />
    </Suspense>
  );
}
