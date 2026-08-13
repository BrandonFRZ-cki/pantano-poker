"use client";

import type { Player, TournamentSettings, Transaction } from "@/types/tournament";
import { computeChipLeaderBonus, computePot } from "@/lib/prizes";
import { formatMoney } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";

function placeLabel(rank: number): string {
  return `${rank}º puesto`;
}

/**
 * Tarjeta pública: bote total y cuánto le toca a cada puesto. Se muestra
 * recién cuando ya no se aceptan recompras ni addon (ahí se sabe cómo quedó
 * la burbuja de premios); antes de eso el bote todavía puede crecer.
 */
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

  // Torneos creados antes de estos campos: se asume que seguían abiertos
  // en cualquier nivel.
  const rebuyUntilLevel = tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const addonLevel = tournament.addonLevel ?? 1;
  const entriesClosed =
    tournament.status === "finished" ||
    tournament.currentLevel > Math.max(rebuyUntilLevel, addonLevel);

  if (!entriesClosed) {
    const closeLevel = Math.max(rebuyUntilLevel, addonLevel);
    return (
      <Card className="flex flex-col items-center gap-2 text-center border-dashed">
        <p className="text-sm font-medium text-pp-brown/70">Bote y premios</p>
        <p className="text-sm text-pp-brown/60">
          El bote todavía puede crecer: se muestra cuando cierren las
          recompras y el addon (nivel {closeLevel}).
        </p>
      </Card>
    );
  }

  const pot = computePot(tournament, players, transactions);
  const chipLeader = entriesClosed
    ? computeChipLeaderBonus(tournament, players)
    : null;
  const bountyMode = tournament.bountyMode ?? "fixed";

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
          (bountyMode === "mystery"
            ? " · bounty misterioso (se revela al final)"
            : ` · bounty pagado ${formatMoney(pot.totalBounty)}`)}
      </p>

      {chipLeader && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-pp-green-light/20 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={chipLeader.player.displayName} size={28} />
            <span className="text-sm text-pp-brown truncate">
              👑 Líder de fichas: {chipLeader.player.displayName}
            </span>
          </div>
          <span className="text-sm font-medium text-pp-green-dark shrink-0">
            {formatMoney(chipLeader.amount)}
          </span>
        </div>
      )}

      {tournament.guaranteedFirstPlace > 0 && (
        <p className="text-xs text-pp-brown/50">
          {pot.guaranteedMet
            ? `1er puesto asegurado: ${formatMoney(tournament.guaranteedFirstPlace)}`
            : `Todavía no se alcanza el mínimo garantizado para el 1er puesto (${formatMoney(tournament.guaranteedFirstPlace)}), así que por ahora se reparte por porcentaje.`}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {pot.prizes.map((prize) => (
          <div
            key={prize.rank}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-pp-brown/50 w-16 shrink-0">
                {placeLabel(prize.rank)}
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
