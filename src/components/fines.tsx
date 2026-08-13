"use client";

import type { Player, Transaction } from "@/types/tournament";
import { formatMoney } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";

/** Tarjeta del dealer/dueño: multas registradas y el total del fondo de trofeo. */
export function FinesCard({
  transactions,
  players,
}: {
  transactions: Transaction[];
  players: Player[];
}) {
  const fines = transactions.filter((t) => t.type === "fine");
  if (fines.length === 0) return null;

  const total = fines.reduce((sum, t) => sum + t.amount, 0);
  const nameFor = (uid: string) =>
    players.find((p) => p.uid === uid)?.displayName ?? "Jugador";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-pp-brown/70">
          Multas (fondo de trofeo)
        </p>
        <span className="text-sm font-medium text-pp-green-dark">
          {formatMoney(total)}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-pp-green-mid/10">
        {fines.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={nameFor(t.playerId)} size={28} />
              <div className="min-w-0">
                <p className="text-sm text-pp-brown truncate">
                  {nameFor(t.playerId)}
                </p>
                {t.reason && (
                  <p className="text-xs text-pp-brown/50 truncate">
                    {t.reason}
                  </p>
                )}
              </div>
            </div>
            <span className="text-sm text-pp-brown/70 shrink-0">
              {formatMoney(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
