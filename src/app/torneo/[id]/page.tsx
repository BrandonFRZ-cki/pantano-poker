"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getPlayerInTournament, getTournament } from "@/lib/tournaments";
import type { Player, TournamentSettings } from "@/types/tournament";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin (respaldo del dealer)",
  dealer: "Dealer",
  player: "Jugador",
};

export default function TorneoDetallePage({
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
  const [player, setPlayer] = useState<Player | null>(null);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getTournament(id), getPlayerInTournament(id, profile.uid)])
      .then(([t, p]) => {
        setTournament(t);
        setPlayer(p);
      })
      .finally(() => setFetching(false));
  }, [id, profile]);

  if (loading || !firebaseUser || !profile || fetching) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  if (!tournament || !player) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-4">
        <p className="text-pp-brown/80">
          No encontramos este torneo, o todavía no sos parte de él.
        </p>
        <Link href="/panel" className="text-pp-green-dark underline">
          Volver a mis torneos
        </Link>
      </div>
    );
  }

  const isDealer = tournament.dealerUids.includes(profile.uid);
  const joinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/torneo/unirse?code=${tournament.joinCode}`
      : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 items-center bg-pp-cream px-6 py-12 gap-6 text-center">
      <Link href="/panel" className="text-sm text-pp-brown/60 underline self-start">
        ← Mis torneos
      </Link>

      <h1 className="font-display text-2xl text-pp-green-dark">
        {tournament.name}
      </h1>
      <span className="rounded-full bg-pp-green-light/30 px-4 py-1 text-sm text-pp-green-dark">
        {ROLE_LABEL[player.role] ?? player.role}
      </span>

      {isDealer && (
        <div className="w-full max-w-xs rounded-2xl bg-white/60 border border-pp-green-mid/20 px-5 py-4 flex flex-col gap-2">
          <p className="text-sm text-pp-brown/70">
            Código para que se unan los jugadores
          </p>
          <p className="font-mono text-2xl tracking-widest text-pp-green-dark">
            {tournament.joinCode}
          </p>
          <button
            onClick={handleCopy}
            className="text-sm text-pp-green-dark underline"
          >
            {copied ? "¡Copiado!" : "Copiar link para compartir"}
          </button>
        </div>
      )}

      <p className="max-w-sm text-pp-brown/80">
        Acá van a vivir el timer, las mesas, las recompras y el bote. Esta
        pantalla se construye en la próxima fase.
      </p>
    </div>
  );
}
