"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  setPlayerRole,
  subscribeToPlayer,
  subscribeToPlayers,
  subscribeToTables,
  subscribeToTournament,
  subscribeToTransactions,
} from "@/lib/tournaments";
import type {
  Player,
  PokerTable,
  TournamentSettings,
  Transaction,
} from "@/types/tournament";
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
import { RegistrationCard } from "@/components/roster";
import { TablesCard } from "@/components/tables";
import { StandingsCard } from "@/components/standings";
import { PrizesCard } from "@/components/prizes";
import { FinesCard } from "@/components/fines";
import { LoadingScreen } from "@/components/loading";
import { formatChips } from "@/lib/format";

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
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

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
  const isDealer = !!tournament?.dealerUids.includes(profile?.uid ?? "");

  // Lista de jugadores y mesas en vivo: todos la necesitan para ver quién
  // está en su mesa, no solo el dealer.
  useEffect(() => subscribeToPlayers(id, setPlayers), [id]);
  useEffect(() => subscribeToTables(id, setTables), [id]);
  useEffect(() => subscribeToTransactions(id, setTransactions), [id]);

  // Aviso cuando te cambiaron de mesa (balanceo, movimiento manual, etc.):
  // se compara la mesa anterior con la actual cada vez que cambia el
  // jugador en vivo.
  const prevTableIdRef = useRef<string | null | undefined>(undefined);
  const [tableChangeNotice, setTableChangeNotice] = useState<string | null>(
    null
  );
  useEffect(() => {
    if (!player) return;
    const prev = prevTableIdRef.current;
    if (
      prev !== undefined &&
      prev !== player.tableId &&
      player.tableId &&
      player.status === "active"
    ) {
      const table = tables.find((t) => t.id === player.tableId);
      setTableChangeNotice(
        `Te cambiaste a ${table?.name ?? "otra mesa"}${player.seat ? `, asiento ${player.seat}` : ""}.`
      );
    }
    prevTableIdRef.current = player.tableId;
  }, [player, tables]);

  if (loading || !firebaseUser || !profile || fetching) {
    return (
      <LoadingScreen />
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
    } finally {
      setSavingUid(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
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

        {tableChangeNotice && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-pp-green-light/30 border border-pp-green-mid/30 px-4 py-2.5">
            <p className="text-sm text-pp-green-dark">{tableChangeNotice}</p>
            <button
              type="button"
              onClick={() => setTableChangeNotice(null)}
              className="text-xs text-pp-green-dark/60 hover:text-pp-green-dark underline shrink-0"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-3xl text-pp-green-dark leading-tight">
            {tournament.name}
          </h1>
          <Badge tone={ROLE_TONE[effectiveRole]}>
            {ROLE_LABEL[effectiveRole] ?? effectiveRole}
          </Badge>
          <p className="text-sm text-pp-brown/70">
            {player.buyInAt
              ? `Tu stack: ${formatChips(player.chips)} fichas`
              : "Todavía no te registraron el buy-in"}
          </p>
        </div>

        {/* En celular todo va en una sola columna; en pantallas grandes se
            aprovecha el ancho con dos columnas lado a lado. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
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

            {isDealer && (
              <RegistrationCard
                tournament={tournament}
                players={players}
                tables={tables}
                actingUid={profile.uid}
              />
            )}

            {isDealer && (
              <FinesCard transactions={transactions} players={players} />
            )}
          </div>

          <div className="flex flex-col gap-6">
            <PrizesCard
              tournament={tournament}
              players={players}
              transactions={transactions}
            />

            <StandingsCard players={players} currentUid={profile.uid} />
          </div>
        </div>

        <TablesCard
          tournament={tournament}
          players={players}
          tables={tables}
          isDealer={isDealer}
          currentUid={profile.uid}
        />

        {isOwner && (
          <Card className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-pp-brown/70">
              <IconUsers />
              <p className="text-sm font-medium">
                Roles ({players.length} jugadores)
                {tournament.dealerMode === "rotating" && (
                  <span className="text-pp-brown/50">
                    {" "}
                    · dealer rotativo activado
                  </span>
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {players.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-pp-green-mid/10 sm:border-b-0 sm:py-2 last:border-b-0"
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
      </div>
    </div>
  );
}
