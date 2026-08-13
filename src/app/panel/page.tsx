"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getUserTournaments } from "@/lib/tournaments";
import type { TournamentSettings } from "@/types/tournament";
import { Badge, Card, LinkButton } from "@/components/ui";
import { LoadingScreen } from "@/components/loading";

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
      <LoadingScreen />
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="font-display text-3xl text-pp-green-dark">
            Hola, {profile.displayName}
          </h1>
          <button
            onClick={() => signOutUser()}
            className="mt-1 text-sm text-pp-brown/50 hover:text-pp-brown/70 underline"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="flex gap-3 w-full">
          <LinkButton href="/torneo/nuevo" size="sm" className="flex-1">
            Crear torneo
          </LinkButton>
          <LinkButton
            href="/torneo/unirse"
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            Unirse a torneo
          </LinkButton>
        </div>

        <div className="w-full flex flex-col gap-3">
          {tournaments === null && (
            <p className="text-center text-pp-brown/60">
              Cargando tus torneos…
            </p>
          )}
          {tournaments?.length === 0 && (
            <Card className="text-center text-pp-brown/70 text-sm border-dashed">
              Todavía no estás en ningún torneo. Crea uno o únete con un
              código.
            </Card>
          )}
          {tournaments?.map((t) => (
            <Link key={t.id} href={`/torneo/${t.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 hover:bg-white transition-colors">
                <div>
                  <p className="font-display text-pp-green-dark">{t.name}</p>
                  <p className="text-sm text-pp-brown/60">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </p>
                </div>
                <Badge tone={t.ownerUid === profile.uid ? "owner" : "neutral"}>
                  {t.ownerUid === profile.uid ? "Dueño" : "Miembro"}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
