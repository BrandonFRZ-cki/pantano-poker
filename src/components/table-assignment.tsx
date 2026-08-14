"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  confirmSeat,
  subscribeToPlayer,
  subscribeToPlayers,
  subscribeToTables,
  subscribeToTournament,
} from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { Avatar } from "@/components/ui";

/**
 * Pantalla completa que ve un jugador apenas le asignan (o le cambian) de
 * mesa: en qué mesa y asiento quedó y quién es el dealer, con un botón para
 * confirmar que ya está sentado ahí. Usa un color distinto al de la pantalla
 * de "fuiste eliminado" para que no se confundan de un vistazo.
 */
export function TableAssignedOverlay({
  table,
  seat,
  dealerName,
  onConfirm,
  onClose,
  confirmed,
  confirming,
}: {
  table: PokerTable;
  seat: number | null;
  dealerName: string | null;
  onConfirm: () => void;
  onClose: () => void;
  confirmed: boolean;
  confirming: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-10 text-center gap-5 bg-sky-900">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white text-sm underline"
      >
        Cerrar
      </button>

      <Avatar name={table.name} size={64} />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium bg-sky-100/10 text-sky-200 inline-block rounded-full px-4 py-1 mx-auto">
          Te asignaron mesa
        </p>
        <h1 className="font-display text-3xl text-white">{table.name}</h1>
      </div>

      <div className="flex flex-col gap-1 text-white/90">
        {seat && <p className="text-lg">Asiento #{seat}</p>}
        <p className="text-sm text-white/70">
          Dealer: {dealerName ?? "todavía sin asignar"}
        </p>
      </div>

      <p className="text-white/50 text-xs max-w-xs">
        Anda a esa mesa y confirma tu asiento apenas te sientes, para que el
        resto sepa que ya llegaste.
      </p>

      <div className="flex flex-col gap-2 mt-2 w-full max-w-xs">
        {confirmed ? (
          <p className="text-sm text-white/70">
            Ya confirmaste tu asiento en esta mesa.
          </p>
        ) : (
          <button
            type="button"
            className="rounded-full font-display py-3 px-6 bg-white text-sky-900 hover:bg-white/90 transition-colors disabled:opacity-50"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Confirmando…" : "Ya estoy sentado"}
          </button>
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

/** Tarjeta chica y persistente para recordar confirmar el asiento mientras no se hizo. */
export function TableAssignedBanner({
  table,
  onOpen,
}: {
  table: PokerTable;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-200/60 px-4 py-2.5 text-left"
    >
      <span className="text-sm text-sky-800">
        Te asignaron {table.name} · falta confirmar tu asiento
      </span>
      <span className="text-xs text-sky-700/70 underline shrink-0">
        Ver
      </span>
    </button>
  );
}

/**
 * Componente invisible por defecto, montado en el Header en cualquier
 * pantalla dentro de un torneo (igual que EliminationGate): apenas a un
 * jugador (no local, con celular propio) le asignan o cambian de mesa,
 * aparece esta pantalla completa sin importar en qué pantalla esté.
 */
export function TableAssignmentGate({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const { profile } = useAuth();
  const [tournament, setTournament] = useState<TournamentSettings | null>(
    null
  );
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const prevTableIdRef = useRef<string | null | undefined>(undefined);

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
  useEffect(() => subscribeToTables(tournamentId, setTables), [tournamentId]);

  useEffect(() => {
    if (!player || player.isLocal) return;
    const prev = prevTableIdRef.current;
    if (
      prev !== undefined &&
      player.tableId &&
      player.tableId !== prev &&
      player.status === "active"
    ) {
      setShowOverlay(true);
      setJustConfirmed(false);
    }
    prevTableIdRef.current = player.tableId;
  }, [player]);

  if (!tournament || !player || player.isLocal) return null;

  const table = player.tableId
    ? tables.find((t) => t.id === player.tableId)
    : null;

  // Igual que en EliminationGate: se deriva en vivo en vez de resetear el
  // estado a mano desde un efecto (evita el mismo lint de setState en
  // efectos y también se actualiza solo si otro dealer lo confirma por él).
  const overlayVisible = showOverlay && !!table;
  const confirmed = justConfirmed || !!player.seatConfirmedAt;
  const needsConfirm = !!table && !confirmed;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmSeat(tournamentId, player.uid);
      setJustConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

  const dealerName = table?.dealerUid
    ? (players.find((p) => p.uid === table.dealerUid)?.displayName ?? null)
    : null;

  return (
    <>
      {overlayVisible && table && (
        <TableAssignedOverlay
          table={table}
          seat={player.seat}
          dealerName={dealerName}
          onConfirm={handleConfirm}
          onClose={() => setShowOverlay(false)}
          confirmed={confirmed}
          confirming={confirming}
        />
      )}
      {needsConfirm && !overlayVisible && table && (
        <div className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md">
          <TableAssignedBanner table={table} onOpen={() => setShowOverlay(true)} />
        </div>
      )}
    </>
  );
}
