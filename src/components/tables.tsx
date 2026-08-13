"use client";

import { useState } from "react";
import { assignTables, balanceTables, movePlayerToTable } from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { Avatar, Button, Card } from "@/components/ui";

function nameFor(players: Player[], uid: string): string {
  return players.find((p) => p.uid === uid)?.displayName ?? "…";
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div key={table.id}>
            <p className="text-xs font-medium text-pp-brown/50 mb-2">
              {table.name}
            </p>
            <div className="flex flex-col gap-2">
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
