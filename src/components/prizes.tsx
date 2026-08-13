"use client";

import type { Player, TournamentSettings, Transaction } from "@/types/tournament";
import { computePot } from "@/lib/prizes";
import { formatMoney } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";

const PLACE_LABEL: Record<number, string> = {
  1: "1º puesto",
  2: "2º puesto",
  3: "3º puesto",
  4: "4º puesto",
};

/** Tarjeta pública: bote total y cuánto le toca a cada puesto. */
export function PrizesCard({
  tournament,
  players,
  transactions,
}: {
  tournament: TournamentSettings;
  players: Player[];
  transactions: Transaction[];
}) {
  const registered = players.some((p) => p.buyInAt);
  if (!registered) return null;

  const pot = computePot(tournament, players, transactions);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-pp-brown/70">Bote y premios</p>
        <span className="font-display text-lg text-pp-green-dark">
          {formatMoney(pot.netPool)}
        </span>
      </div>

      <p className="text-xs text-pp-brown/50">
        Recaudado {formatMoney(pot.totalCollected)}
        {pot.totalBounty > 0 &&
          ` · bounty pagado ${formatMoney(pot.totalBounty)}`}
      </p>

      <div className="flex flex-col gap-2.5">
        {pot.prizes.map((prize) => (
          <div
            key={prize.rank}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-pp-brown/50 w-16 shrink-0">
                {PLACE_LABEL[prize.rank] ?? `${prize.rank}º puesto`}
              </span>
              {prize.player && <Avatar name={prize.player.displayName} size={28} />}
              <span className="text-sm text-pp-brown truncate">
                {prize.player?.displayName ?? "Por definir"}
              </span>
            </div>
            <span className="text-sm font-medium text-pp-green-dark shrink-0">
              {formatMoney(prize.amount)}
            </span>
          </div>
        ))}
      </div>

      {tournament.status !== "finished" && (
        <p className="text-xs text-pp-brown/40">
          Se actualiza en vivo según las posiciones actuales. El reparto
          queda confirmado recién cuando el torneo termina.
        </p>
      )}
    </Card>
  );
}
