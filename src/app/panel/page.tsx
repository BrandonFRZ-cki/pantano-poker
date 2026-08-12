"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getUserTournaments } from "@/lib/tournaments";
import type { TournamentSettings } from "@/types/tournament";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  registering: "Inscripciones abiertas",
  in_progress: "En curso",
  paused: "Pausado",
  break: "Receso",
  finished: "Finalizado",
};

export default function PanelPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading, signOutUser } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentSettings[] | null>(
    null
  );

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    if (!profile) return;
    getUserTournaments(profile.tournamentIds ?? []).then(setTournaments);
  }, [profile]);

  if (loading || !firebaseUser || !profile) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-8">
      <div className="text-center">
        <h1 className="font-display text-2xl text-pp-green-dark">
          Hola, {profile.displayName}
        </h1>
        <button
          onClick={() => signOutUser()}
          className="mt-1 text-sm text-pp-brown/60 underline"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex gap-3 w-full max-w-sm">
        <Link
          href="/torneo/nuevo"
          className="flex-1 text-center rounded-full bg-pp-green-dark text-pp-cream font-display text-sm py-3 px-4 hover:bg-pp-green-mid transition-colors"
        >
          Crear torneo
        </Link>
        <Link
          href="/torneo/unirse"
          className="flex-1 text-center rounded-full border border-pp-green-dark text-pp-green-dark font-display text-sm py-3 px-4 hover:bg-pp-green-light/20 transition-colors"
        >
          Unirse a torneo
        </Link>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {tournaments === null && (
          <p className="text-center text-pp-brown/60">
            Cargando tus torneos…
          </p>
        )}
        {tournaments?.length === 0 && (
          <p className="text-center text-pp-brown/60">
            Todavía no estás en ningún torneo. Creá uno o unite con un
            código.
          </p>
        )}
        {tournaments?.map((t) => (
          <Link
            key={t.id}
            href={`/torneo/${t.id}`}
            className="rounded-2xl bg-white/60 border border-pp-green-mid/20 px-5 py-4 text-left hover:bg-white transition-colors"
          >
            <p className="font-display text-pp-green-dark">{t.name}</p>
            <p className="text-sm text-pp-brown/60">
              {STATUS_LABEL[t.status] ?? t.status}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
