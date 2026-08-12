"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  listPlayers,
  setPlayerRole,
  subscribeToPlayer,
  subscribeToTournament,
} from "@/lib/tournaments";
import type { Player, TournamentSettings } from "@/types/tournament";
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconUsers,
  LinkButton,
} from "@/components/ui";
import { TimerCard } from "@/components/timer";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño del torneo",
  dealer: "Dealer",
  player: "Jugador",
};

const ROLE_TONE: Record<string, "owner" | "dealer" | "player"> = {
  owner: "owner",
  dealer: "dealer",
  player: "player",
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  const reloadPlayers = async () => {
    setPlayers(await listPlayers(id));
  };

  // Torneo y jugador en vivo: así el timer, el estado (pausado/en curso) y
  // un cambio de rol se ven al instante en todos los celulares.
  useEffect(() => {
    if (!profile) return;
    let tournamentLoaded = false;
    let playerLoaded = false;
    const maybeStopLoading = () => {
      if (tournamentLoaded && playerLoaded) setFetching(false);
    };

    const unsubTournament = subscribeToTournament(id, (t) => {
      setTournament(t);
      tournamentLoaded = true;
      maybeStopLoading();
    });
    const unsubPlayer = subscribeToPlayer(id, profile.uid, (p) => {
      setPlayer(p);
      playerLoaded = true;
      maybeStopLoading();
    });

    return () => {
      unsubTournament();
      unsubPlayer();
    };
  }, [id, profile]);

  const isOwner = tournament?.ownerUid === profile?.uid;

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    listPlayers(id).then((list) => {
      if (!cancelled) setPlayers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [isOwner, id]);

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
          No encontramos este torneo, o todavía no eres parte de él.
        </p>
        <Link href="/panel" className="text-pp-green-dark underline">
          Volver a mis torneos
        </Link>
      </div>
    );
  }

  // El rol que se muestra nunca depende únicamente del dato guardado en el
  // documento del jugador: si sos el dueño del torneo (tournament.ownerUid),
  // siempre se te trata como tal, aunque ese documento sea viejo.
  const effectiveRole = isOwner ? "owner" : player.role;

  const isDealer = tournament.dealerUids.includes(profile.uid);
  const joinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/torneo/unirse?code=${tournament.joinCode}`
      : "";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&color=255e2e&data=${encodeURIComponent(
    joinLink
  )}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleDealer = async (targetUid: string, makeDealer: boolean) => {
    setSavingUid(targetUid);
    try {
      await setPlayerRole(id, targetUid, makeDealer ? "dealer" : "player");
      await reloadPlayers();
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center justify-between w-full">
          <Link
            href="/panel"
            className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
          >
            <IconArrowLeft />
            Mis torneos
          </Link>
          {isOwner && (
            <LinkButton href={`/torneo/${id}/editar`} variant="ghost" size="sm">
              Editar
            </LinkButton>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-3xl text-pp-green-dark leading-tight">
            {tournament.name}
          </h1>
          <Badge tone={ROLE_TONE[effectiveRole]}>
            {ROLE_LABEL[effectiveRole] ?? effectiveRole}
          </Badge>
        </div>

        <TimerCard tournament={tournament} isDealer={isDealer} />

        {isDealer && (
          <Card className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-pp-brown/70">
              Código para que se unan los jugadores
            </p>
            <p className="font-mono text-3xl tracking-[0.3em] text-pp-green-dark">
              {tournament.joinCode}
            </p>
            <div className="rounded-xl overflow-hidden border border-pp-green-mid/20 p-2 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`Código QR para unirse a ${tournament.name}`}
                width={180}
                height={180}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <span className="inline-flex items-center gap-1.5">
                {copied ? <IconCheck /> : <IconCopy />}
                {copied ? "¡Copiado!" : "Copiar link para compartir"}
              </span>
            </Button>
          </Card>
        )}

        {isOwner && (
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-pp-brown/70">
              <IconUsers />
              <p className="text-sm font-medium">
                Jugadores ({players.length})
                {tournament.dealerMode === "rotating" && (
                  <span className="text-pp-brown/50">
                    {" "}
                    · dealer rotativo activado
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col divide-y divide-pp-green-mid/10">
              {players.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={p.displayName} />
                    <span className="text-sm text-pp-brown">
                      {p.displayName}
                      {p.uid === tournament.ownerUid && (
                        <span className="text-pp-brown/50"> (tú)</span>
                      )}
                    </span>
                  </div>
                  {p.uid !== tournament.ownerUid && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleToggleDealer(p.uid, p.role !== "dealer")
                      }
                      disabled={savingUid === p.uid}
                    >
                      {p.role === "dealer" ? "Sacar dealer" : "Hacer dealer"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="border-dashed text-center text-pp-brown/70 text-sm">
          Las mesas, las recompras y el bote se construyen en la próxima
          fase.
        </Card>
      </div>
    </div>
  );
}
