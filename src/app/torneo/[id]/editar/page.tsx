"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getTournament, updateTournamentSettings } from "@/lib/tournaments";
import {
  formStateToInput,
  tournamentToFormState,
  type TournamentFormState,
} from "@/lib/tournament-form-state";
import { TournamentFormFields } from "@/components/tournament-form-fields";
import { Button, IconArrowLeft } from "@/components/ui";
import type { TournamentSettings } from "@/types/tournament";

export default function EditarTorneoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();

  const [tournament, setTournament] = useState<TournamentSettings | null>(
    null
  );
  const [form, setForm] = useState<TournamentFormState | null>(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    getTournament(id)
      .then((t) => {
        setTournament(t);
        if (t) setForm(tournamentToFormState(t));
      })
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateTournamentSettings(id, formStateToInput(form));
      router.push(`/torneo/${id}`);
    } catch {
      setError("No se pudieron guardar los cambios. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !firebaseUser || !profile || fetching) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  if (!tournament || !form) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-4">
        <p className="text-pp-brown/80">No encontramos este torneo.</p>
        <Link href="/panel" className="text-pp-green-dark underline">
          Volver a mis torneos
        </Link>
      </div>
    );
  }

  const setFormSafe = (
    updater: (prev: TournamentFormState) => TournamentFormState
  ) => setForm((prev) => (prev ? updater(prev) : prev));

  if (tournament.ownerUid !== profile.uid) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-4">
        <p className="text-pp-brown/80">
          Solo el dueño del torneo puede editar su configuración.
        </p>
        <Link
          href={`/torneo/${id}`}
          className="text-pp-green-dark underline"
        >
          Volver al torneo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-8">
      <div className="w-full max-w-md flex flex-col items-center gap-2 text-center">
        <Link
          href={`/torneo/${id}`}
          className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown self-start"
        >
          <IconArrowLeft />
          Volver al torneo
        </Link>
        <h1 className="font-display text-2xl text-pp-green-dark">
          Editar torneo
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-8"
      >
        <TournamentFormFields form={form} setForm={setFormSafe} />

        {error && <p className="text-sm text-red-700 text-center">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
