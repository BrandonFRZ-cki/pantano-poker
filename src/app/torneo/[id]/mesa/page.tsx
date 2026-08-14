"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  advanceButton,
  eliminatePlayer,
  nextSpeaker,
  pauseSpeakClock,
  registerRebuy,
  resumeSpeakClock,
  seatPlayerAtTable,
  setRevealedHand,
  setSpeakClockSeconds,
  startSpeakClock,
  subscribeToPlayer,
  subscribeToPlayers,
  subscribeToTables,
  subscribeToTournament,
  updatePlayerChips,
} from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { SeatDiagram } from "@/components/table-seats";
import { MiniLevelTimer } from "@/components/timer";
import { HandPicker } from "@/components/hand-picker";
import { Button, Card, IconArrowLeft, IconPause, IconPlay } from "@/components/ui";
import { LoadingScreen } from "@/components/loading";

function formatClock(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function MesaContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAsUid = searchParams.get("viewAs");
  const { firebaseUser, profile, loading } = useAuth();

  const [tournament, setTournament] = useState<TournamentSettings | null>(
    null
  );
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null);
  const [stackValue, setStackValue] = useState("");
  const [eliminatorChoice, setEliminatorChoice] = useState("");

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

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

  useEffect(() => subscribeToPlayers(id, setPlayers), [id]);
  useEffect(() => subscribeToTables(id, setTables), [id]);

  const isOwner = tournament?.ownerUid === profile?.uid;
  const isDealer = !!tournament?.dealerUids.includes(profile?.uid ?? "");

  // El dueño puede entrar en modo "ver como" un jugador temporal (sin
  // celular propio) para manejarle la mesa. Solo funciona si de verdad es
  // dealer de este torneo, para que nadie más lo pueda forzar por URL.
  const viewedUid = isDealer && viewAsUid ? viewAsUid : profile?.uid;
  const viewedPlayer =
    viewedUid === profile?.uid
      ? player
      : players.find((p) => p.uid === viewedUid) ?? player;

  const myTable = viewedPlayer?.tableId
    ? tables.find((t) => t.id === viewedPlayer.tableId)
    : null;
  const table =
    tables.find((t) => t.id === selectedTableId) ?? myTable ?? tables[0] ?? null;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !firebaseUser || !profile || fetching) {
    return <LoadingScreen />;
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

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  };

  const remainingMs = table?.speakClockEndsAt
    ? table.speakClockEndsAt - now
    : (table?.speakClockPausedMs ?? 0);
  const speakClockRunning = !!table?.speakClockEndsAt;

  const currentActor = table?.currentActorUid
    ? players.find((p) => p.uid === table.currentActorUid)
    : null;

  const rebuyUntilLevel =
    tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const rebuysOpen = tournament.currentLevel <= rebuyUntilLevel;

  // Candidatos a "quién lo eliminó": jugadores activos de esta misma mesa,
  // sin contar al dealer fijo (no juega).
  const eliminatorCandidates = table
    ? players.filter(
        (p) =>
          p.status === "active" &&
          p.uid !== actionPlayer?.uid &&
          table.playerIds.includes(p.uid) &&
          !(tournament.dealerMode === "fixed" && tournament.dealerUids.includes(p.uid))
      )
    : [];

  const openActionPanel = (p: Player) => {
    setActionPlayer(p);
    setStackValue(String(p.chips));
    setEliminatorChoice("");
    setError(null);
  };

  const closeActionPanel = () => {
    setActionPlayer(null);
    setStackValue("");
    setEliminatorChoice("");
  };

  const handleSaveStack = async () => {
    if (!actionPlayer) return;
    const chips = Number(stackValue);
    if (Number.isNaN(chips)) {
      setError("Ingresa un número válido de fichas.");
      return;
    }
    await run(async () => {
      await updatePlayerChips(id, actionPlayer.uid, chips);
      closeActionPanel();
    });
  };

  const handleEliminate = async () => {
    if (!actionPlayer) return;
    await run(async () => {
      await eliminatePlayer(tournament, tables, actionPlayer, eliminatorChoice || null);
      closeActionPanel();
    });
  };

  // Bust-and-rebuy en un solo toque: lo elimina, le da un stack nuevo y lo
  // sienta en una mesa cualquiera (puede ser la misma), útil cuando quedó en
  // 0 fichas y quiere seguir jugando de una.
  const handleQuickRebuy = async () => {
    if (!actionPlayer || tables.length === 0) return;
    await run(async () => {
      await eliminatePlayer(tournament, tables, actionPlayer, null);
      await registerRebuy(tournament, actionPlayer.uid, profile.uid);
      const randomTable = tables[Math.floor(Math.random() * tables.length)];
      await seatPlayerAtTable(id, randomTable, actionPlayer.uid);
      closeActionPanel();
    });
  };

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between w-full">
          <Link
            href={`/torneo/${id}`}
            className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
          >
            <IconArrowLeft />
            Volver al torneo
          </Link>
        </div>

        <h1 className="font-display text-2xl text-pp-green-dark text-center">
          Mi mesa
        </h1>

        <MiniLevelTimer tournament={tournament} />

        {viewAsUid && isDealer && viewedPlayer && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-pp-green-light/30 border border-pp-green-mid/30 px-4 py-2.5">
            <p className="text-sm text-pp-green-dark">
              Viendo como {viewedPlayer.displayName} (modo dealer)
            </p>
            <Link
              href={`/torneo/${id}/mesa`}
              className="text-xs text-pp-green-dark/60 hover:text-pp-green-dark underline shrink-0"
            >
              Volver a mi vista
            </Link>
          </div>
        )}

        {isDealer && tables.length > 1 && (
          <label className="text-sm text-pp-brown/70 text-center">
            Mesa a mostrar
            <select
              className="mt-1 block mx-auto rounded-lg border border-pp-green-mid/40 bg-white px-3 py-1.5 text-pp-brown outline-none focus:border-pp-green-dark"
              value={table?.id ?? ""}
              onChange={(e) => setSelectedTableId(e.target.value)}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {!table ? (
          <Card className="text-center text-pp-brown/70 text-sm border-dashed">
            {isOwner || isDealer
              ? "Todavía no hay mesas armadas."
              : "Todavía no te asignaron una mesa."}
          </Card>
        ) : (
          <>
            <Card className="flex flex-col gap-4">
              <p className="text-sm font-medium text-pp-brown/70 text-center">
                {table.name}
              </p>
              <SeatDiagram
                table={table}
                players={players}
                currentUid={viewedUid ?? profile.uid}
                dealerName={
                  table.dealerUid
                    ? (players.find((p) => p.uid === table.dealerUid)
                        ?.displayName ?? null)
                    : null
                }
                onSeatTap={isDealer ? openActionPanel : undefined}
              />
              {isDealer && (
                <p className="text-xs text-pp-brown/40 text-center -mt-2">
                  Toca a un jugador para editar su stack, eliminarlo o
                  recomprarlo en una mesa al azar.
                </p>
              )}
            </Card>

            {actionPlayer && (
              <Card className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-pp-brown/70">
                    {actionPlayer.displayName}
                  </p>
                  <button
                    type="button"
                    onClick={closeActionPanel}
                    className="text-xs text-pp-brown/50 hover:text-pp-brown underline"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-pp-brown/70 shrink-0">
                    Stack
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="flex-1 text-sm border border-pp-green-mid/30 rounded-full px-3 py-1.5 bg-white text-pp-brown"
                    value={stackValue}
                    onChange={(e) => setStackValue(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={handleSaveStack}
                  >
                    Guardar
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-pp-brown/70 shrink-0">
                    ¿Quién lo eliminó?
                  </span>
                  <select
                    className="flex-1 text-xs border border-pp-green-mid/30 rounded-full px-2 py-1 bg-white text-pp-brown min-w-[8rem]"
                    value={eliminatorChoice}
                    onChange={(e) => setEliminatorChoice(e.target.value)}
                  >
                    <option value="">Sin bounty / no se sabe</option>
                    {eliminatorCandidates.map((other) => (
                      <option key={other.uid} value={other.uid}>
                        {other.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={handleEliminate}
                  >
                    Eliminar
                  </Button>
                </div>

                {rebuysOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy || tables.length === 0}
                    onClick={handleQuickRebuy}
                  >
                    Recomprar ya en mesa al azar (elimina + reingresa de una)
                  </Button>
                )}
                {error && <p className="text-sm text-red-700">{error}</p>}
              </Card>
            )}

            <Card className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-pp-brown/70">
                Reloj para hablar
                {currentActor && ` · turno de ${currentActor.displayName}`}
              </p>
              <p className="font-display text-4xl text-pp-green-dark tabular-nums">
                {formatClock(remainingMs)}
              </p>
              <p className="text-xs text-pp-brown/40">
                No tiene nada que ver con el timer de niveles. Sirve para
                contar fichas, armar el pozo de un all-in y más.
              </p>

              {isDealer && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => advanceButton(id, table))}
                  >
                    Siguiente mano
                  </Button>
                  {speakClockRunning ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => pauseSpeakClock(id, table))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <IconPause />
                        Pausar
                      </span>
                    </Button>
                  ) : table.speakClockPausedMs ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => resumeSpeakClock(id, table))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <IconPlay />
                        Reanudar
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(() => startSpeakClock(id, table))}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <IconPlay />
                        Iniciar reloj
                      </span>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => nextSpeaker(id, table))}
                  >
                    Siguiente jugador
                  </Button>
                  <label className="text-xs text-pp-brown/60 flex items-center gap-1">
                    Segundos
                    <select
                      className="border border-pp-green-mid/30 rounded-lg px-1.5 py-1 bg-white text-pp-brown"
                      value={table.speakClockSeconds ?? 30}
                      onChange={(e) =>
                        run(() =>
                          setSpeakClockSeconds(
                            id,
                            table.id,
                            Number(e.target.value)
                          )
                        )
                      }
                    >
                      {[15, 20, 30, 45, 60].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {error && <p className="text-sm text-red-700">{error}</p>}
            </Card>

            {viewedPlayer &&
              viewedPlayer.status === "active" &&
              table.playerIds.includes(viewedPlayer.uid) && (
                <HandPicker
                  revealedHand={viewedPlayer.revealedHand}
                  onSave={(cards) =>
                    setRevealedHand(id, viewedPlayer.uid, cards)
                  }
                />
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MesaPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MesaContent {...props} />
    </Suspense>
  );
}
