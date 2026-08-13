"use client";

import { useState } from "react";
import { assignTables, balanceTables, movePlayerToTable } from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { Avatar, Button, Card } from "@/components/ui";
import { SeatDiagram } from "@/components/table-seats";

function nameFor(players: Player[], uid: string): string {
  return players.find((p) => p.uid === uid)?.displayName ?? "…";
}

/**
 * Quién está a cargo de repartir: con dealer fijo, es la misma persona en
 * todas las mesas (la primera de dealerUids con cuenta). Con dealer
 * rotativo no hay uno solo asignado, así que se avisa que va rotando.
 */
function dealerInChargeLabel(
  tournament: TournamentSettings,
  players: Player[]
): string | null {
  if (tournament.dealerMode !== "fixed") return null;
  return (
    players.find((p) => tournament.dealerUids.includes(p.uid))?.displayName ??
    null
  );
}

export function TablesCard({
  tournament,
  players,
  tables,
  isDealer,
  currentUid,
}: {
  tournament: TournamentSettings;
  players: Player[];
  tables: PokerTable[];
  isDealer: boolean;
  currentUid: string;
}) {
  const [assigning, setAssigning] = useState(false);
  const [balancing, setBalancing] = useState(false);
  const [movingUid, setMovingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligibleCount = players.filter(
    (p) => p.buyInAt && p.status === "active"
  ).length;

  const counts = tables.map((t) => t.playerIds.length);
  const imbalance =
    counts.length > 1 ? Math.max(...counts) - Math.min(...counts) : 0;
  const shortTable = tables.find((t) => t.playerIds.length === Math.min(...counts));
  const dealerInCharge = dealerInChargeLabel(tournament, players);

  const handleAssign = async () => {
    setAssigning(true);
    setError(null);
    try {
      await assignTables(tournament, players);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron armar las mesas."
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleBalance = async () => {
    setBalancing(true);
    setError(null);
    try {
      await balanceTables(tournament.id, tables);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudieron balancear las mesas."
      );
    } finally {
      setBalancing(false);
    }
  };

  const handleMove = async (playerUid: string, targetTableId: string) => {
    setMovingUid(playerUid);
    setError(null);
    try {
      await movePlayerToTable(tournament.id, tables, playerUid, targetTableId);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo mover al jugador."
      );
    } finally {
      setMovingUid(null);
    }
  };

  if (tables.length === 0) {
    if (!isDealer) return null;
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-pp-brown/70">
          Todavía no armaste las mesas ({eligibleCount} jugador
          {eligibleCount === 1 ? "" : "es"} con buy-in registrado)
        </p>
        <Button
          size="sm"
          disabled={assigning || eligibleCount === 0}
          onClick={handleAssign}
        >
          {assigning ? "Armando…" : "Armar mesas"}
        </Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-pp-brown/70">Mesas</p>
        {isDealer && (
          <div className="flex items-center gap-3">
            {tables.length > 1 && (
              <button
                type="button"
                disabled={balancing}
                onClick={handleBalance}
                className="text-sm text-pp-green-dark underline disabled:opacity-50"
              >
                {balancing ? "Balanceando…" : "Balancear mesas"}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={assigning}
              onClick={handleAssign}
            >
              {assigning ? "Rehaciendo…" : "Rehacer mesas"}
            </Button>
          </div>
        )}
      </div>
      {isDealer && tables.length > 1 && (
        <p className="text-xs text-pp-brown/40 -mt-2">
          &quot;Balancear&quot; mueve solo a los jugadores necesarios;
          &quot;Rehacer&quot; vuelve a repartir a todos desde cero.
        </p>
      )}

      {isDealer && imbalance > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-300/60 px-4 py-2.5">
          <p className="text-sm text-amber-900">
            {shortTable?.name ?? "Una mesa"} quedó con menos jugadores que
            las demás — conviene balancear antes de la próxima mano.
          </p>
          <button
            type="button"
            disabled={balancing}
            onClick={handleBalance}
            className="text-sm text-amber-900 underline shrink-0 disabled:opacity-50"
          >
            Balancear ahora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div key={table.id}>
            <p className="text-xs font-medium text-pp-brown/50 mb-2">
              {table.name}
              {tournament.dealerMode === "fixed" && (
                <span className="text-pp-brown/40">
                  {" "}
                  · dealer: {dealerInCharge ?? "sin asignar"}
                </span>
              )}
              {tournament.dealerMode === "rotating" && (
                <span className="text-pp-brown/40"> · dealer rotativo</span>
              )}
            </p>
            {table.playerIds.length > 0 && (
              <SeatDiagram
                table={table}
                players={players}
                currentUid={currentUid}
                dealerName={dealerInCharge}
                compact
              />
            )}
            <div className="flex flex-col gap-2 mt-3">
              {table.playerIds.map((uid, index) => (
                <div
                  key={uid}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={nameFor(players, uid)} size={28} />
                    <span className="text-sm text-pp-brown">
                      Asiento {index + 1} · {nameFor(players, uid)}
                      {uid === currentUid && (
                        <span className="text-pp-brown/50"> (tú)</span>
                      )}
                    </span>
                  </div>
                  {isDealer && tables.length > 1 && (
                    <select
                      className="text-xs border border-pp-green-mid/30 rounded-full px-2 py-1 bg-white text-pp-brown/70"
                      value={table.id}
                      disabled={movingUid === uid}
                      onChange={(e) => handleMove(uid, e.target.value)}
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {table.playerIds.length === 0 && (
                <p className="text-xs text-pp-brown/40">Sin jugadores</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}
