"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { computePot, rankPlayers } from "@/lib/prizes";
import {
  requestRebuy,
  subscribeToPlayer,
  subscribeToPlayers,
  subscribeToTournament,
  subscribeToTransactions,
} from "@/lib/tournaments";
import type { Player, TournamentSettings, Transaction } from "@/types/tournament";
import { formatMoney } from "@/lib/format";
import { Avatar } from "@/components/ui";

/**
 * Pantalla completa que ve un jugador recién eliminado: en qué puesto quedó,
 * cuánto le tocaría de premio (estimado en vivo), quién lo eliminó, y un
 * botón para pedir recompra si todavía se puede. Verde si por ahora está
 * "en el dinero" (entre los puestos pagados), rojo si no.
 */
export function EliminatedOverlay({
  tournament,
  player,
  players,
  transactions,
  onClose,
}: {
  tournament: TournamentSettings;
  player: Player;
  players: Player[];
  transactions: Transaction[];
  onClose: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(!!player.rebuyRequestedAt);

  const ranked = rankPlayers(players);
  const mine = ranked.find((r) => r.player.uid === player.uid);
  const pot = computePot(tournament, players, transactions);
  const myPrize = pot.prizes.find((pr) => pr.player?.uid === player.uid);
  const inTheMoney = !!myPrize && myPrize.amount > 0;

  const eliminator = player.eliminatedBy
    ? players.find((p) => p.uid === player.eliminatedBy)
    : null;

  const rebuyUntilLevel =
    tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const rebuysOpen = tournament.currentLevel <= rebuyUntilLevel;

  const handleRequestRebuy = async () => {
    setRequesting(true);
    try {
      await requestRebuy(tournament.id, player.uid);
      setRequested(true);
    } finally {
      setRequesting(false);
    }
  };

  const theme = inTheMoney
    ? {
        bg: "bg-pp-green-dark",
        accent: "text-pp-green-light",
        badge: "bg-pp-green-light/20 text-pp-green-light",
      }
    : {
        bg: "bg-red-900",
        accent: "text-red-200",
        badge: "bg-red-100/10 text-red-200",
      };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-10 text-center gap-5 ${theme.bg}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white text-sm underline"
      >
        Cerrar
      </button>

      <Avatar name={player.displayName} size={64} />

      <div className="flex flex-col gap-1">
        <p className={`text-sm font-medium ${theme.badge} inline-block rounded-full px-4 py-1 mx-auto`}>
          {inTheMoney ? "Quedaste en el dinero" : "Fuiste eliminado"}
        </p>
        <h1 className="font-display text-3xl text-white">
          Quedaste top #{mine?.rank ?? "?"}
        </h1>
      </div>

      {myPrize && myPrize.amount > 0 && (
        <p className={`font-display text-2xl ${theme.accent}`}>
          Tu premio (estimado): {formatMoney(myPrize.amount)}
        </p>
      )}

      {eliminator && (
        <p className="text-white/80 text-sm">
          Te eliminó: <span className="font-medium">{eliminator.displayName}</span>
        </p>
      )}

      <p className="text-white/50 text-xs max-w-xs">
        El puesto y el premio pueden cambiar mientras el torneo sigue en
        curso — se confirman recién cuando termina.
      </p>

      <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
        {rebuysOpen ? (
          requested ? (
            <p className="text-sm text-white/70">
              Ya pediste recompra — esperando que el dealer la apruebe.
            </p>
          ) : (
            <button
              type="button"
              className="rounded-full font-display py-3 px-6 bg-white text-pp-green-dark hover:bg-white/90 transition-colors disabled:opacity-50"
              disabled={requesting}
              onClick={handleRequestRebuy}
            >
              {requesting ? "Pidiendo…" : "Solicitar recompra"}
            </button>
          )
        ) : (
          <p className="text-sm text-white/50">
            Las recompras ya están cerradas para este torneo.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white text-sm underline"
        >
          Seguir viendo el torneo
        </button>
      </div>
    </div>
  );
}

/** Tarjeta chica y persistente para reabrir el resumen mientras sigue eliminado. */
export function EliminatedBanner({
  player,
  onOpen,
}: {
  player: Player;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200/60 px-4 py-2.5 text-left"
    >
      <span className="text-sm text-red-800">
        Fuiste eliminado
        {player.rebuyRequestedAt && " · pediste recompra, esperando al dealer"}
      </span>
      <span className="text-xs text-red-700/70 underline shrink-0">
        Ver resumen
      </span>
    </button>
  );
}

/**
 * Componente invisible por defecto, montado en el Header en cualquier
 * pantalla dentro de un torneo (igual que TournamentWatcher). Antes la
 * pantalla de "fuiste eliminado" solo se disparaba desde la pantalla
 * principal del torneo, así que si te eliminaban mientras estabas en "Mi
 * mesa" o en "Reglas" no la veías hasta volver al menú principal. Al vivir
 * acá aparece de una, sin importar en qué pantalla estés.
 */
export function EliminationGate({ tournamentId }: { tournamentId: string }) {
  const { profile } = useAuth();
  const [tournament, setTournament] = useState<TournamentSettings | null>(
    null
  );
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(
    () => subscribeToTournament(tournamentId, setTournament),
    [tournamentId]
  );
  useEffect(() => {
    if (!profile) return;
    return subscribeToPlayer(tournamentId, profile.uid, setPlayer);
  }, [tournamentId, profile]);
  useEffect(
    () => subscribeToPlayers(tournamentId, setPlayers),
    [tournamentId]
  );
  useEffect(
    () => subscribeToTransactions(tournamentId, setTransactions),
    [tournamentId]
  );

  useEffect(() => {
    if (!player) return;
    const prev = prevStatusRef.current;
    if (prev === "active" && player.status === "eliminated") {
      setShowOverlay(true);
    }
    prevStatusRef.current = player.status;
  }, [player]);

  if (!tournament || !player) return null;

  return (
    <>
      {showOverlay && (
        <EliminatedOverlay
          tournament={tournament}
          player={player}
          players={players}
          transactions={transactions}
          onClose={() => setShowOverlay(false)}
        />
      )}
      {player.status === "eliminated" && !showOverlay && (
        <div className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md">
          <EliminatedBanner player={player} onOpen={() => setShowOverlay(true)} />
        </div>
      )}
    </>
  );
}
