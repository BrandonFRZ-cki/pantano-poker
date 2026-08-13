"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createTournament } from "@/lib/tournaments";
import {
  BALA_TOURNAMENT_STATE,
  BLANK_TOURNAMENT_STATE,
  formStateToInput,
  PANTANO_TOURNAMENT_STATE,
  type TournamentFormState,
} from "@/lib/tournament-form-state";
import { TournamentFormFields } from "@/components/tournament-form-fields";
import { Button, IconArrowLeft } from "@/components/ui";
import { LoadingScreen } from "@/components/loading";

export default function NuevoTorneoPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();
  const [form, setForm] = useState<TournamentFormState>(
    PANTANO_TOURNAMENT_STATE
  );
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
      const id = await createTournament(formStateToInput(form), profile);
      router.push(`/torneo/${id}`);
    } catch {
      setError("No se pudo crear el torneo. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !firebaseUser || !profile) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-8">
      <div className="w-full max-w-lg flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-3 w-full max-w-md">
          <Link
            href="/panel"
            className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
          >
            <IconArrowLeft />
            Mis torneos
          </Link>
        </div>
        <Image
          src="/icons/logo.svg"
          alt="Pantano Poker"
          width={48}
          height={48}
          unoptimized
        />
        <h1 className="font-display text-2xl text-pp-green-dark">
          Crear torneo
        </h1>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setForm(PANTANO_TOURNAMENT_STATE)}
          >
            Usar valores de Pantano Poker
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setForm(BALA_TOURNAMENT_STATE)}
          >
            Usar valores de Torneo Bala (rápido)
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setForm(BLANK_TOURNAMENT_STATE)}
          >
            Empezar en blanco
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg flex flex-col gap-6"
      >
        <TournamentFormFields form={form} setForm={setForm} />

        {error && <p className="text-sm text-red-700 text-center">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creando…" : "Crear torneo"}
        </Button>
      </form>
    </div>
  );
}
