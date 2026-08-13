"use client";

import type { Player } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { rankPlayers } from "@/lib/prizes";
import { Avatar, Card } from "@/components/ui";

function Row({
  rank,
  player,
  currentUid,
  extra,
  eliminated,
}: {
  rank: string;
  player: Player;
  currentUid: string;
  extra?: string;
  eliminated?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg ${
        eliminated ? "bg-red-50 border border-red-200/60 px-2 py-1" : ""
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-xs w-7 shrink-0 ${eliminated ? "text-red-700/60" : "text-pp-brown/50"}`}
        >
          {rank}
        </span>
        <Avatar name={player.displayName} size={28} />
        <span
          className={`text-sm truncate ${eliminated ? "text-red-800" : "text-pp-brown"}`}
        >
          {player.displayName}
          {player.uid === currentUid && (
            <span className="text-pp-brown/50"> (tú)</span>
          )}
        </span>
      </div>
      {extra && (
        <span
          className={`text-xs shrink-0 text-right ${eliminated ? "text-red-700/70" : "text-pp-brown/60"}`}
        >
          {extra}
        </span>
      )}
    </div>
  );
}

/** Tarjeta de posiciones, visible para todos: quién sigue jugando y quién salió. */
export function StandingsCard({
  players,
  currentUid,
}: {
  players: Player[];
  currentUid: string;
}) {
  const registered = players.filter((p) => p.buyInAt);
  const ranked = rankPlayers(players);

  const active = ranked.filter((r) => r.player.status === "active");
  const eliminated = ranked.filter((r) => r.player.status === "eliminated");

  if (registered.length === 0) return null;

  const bountyText = (p: Player) =>
    p.bountiesWon.length > 0
      ? `${p.bountiesWon.length} bounty${p.bountiesWon.length > 1 ? "s" : ""}`
      : null;

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-medium text-pp-brown/70">
        Posiciones ({active.length} activo{active.length === 1 ? "" : "s"})
      </p>

      <div className="flex flex-col gap-2.5">
        {active.map((r) => (
          <Row
            key={r.player.uid}
            rank={`${r.rank}º`}
            player={r.player}
            currentUid={currentUid}
            extra={[`${formatChips(r.player.chips)} fichas`, bountyText(r.player)]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </div>

      {eliminated.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-3 border-t border-pp-green-mid/10">
          <p className="text-xs text-pp-brown/50">Eliminados</p>
          {eliminated.map((r) => {
            const eliminator = registered.find(
              (other) => other.uid === r.player.eliminatedBy
            );
            return (
              <Row
                key={r.player.uid}
                rank={`${r.rank}º`}
                player={r.player}
                currentUid={currentUid}
                eliminated
                extra={[
                  eliminator ? `eliminado por ${eliminator.displayName}` : null,
                  bountyText(r.player),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
