"use client";

import type { Player } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";

function Row({
  rank,
  player,
  currentUid,
  extra,
  muted,
}: {
  rank: string;
  player: Player;
  currentUid: string;
  extra?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-pp-brown/50 w-7 shrink-0">{rank}</span>
        <Avatar name={player.displayName} size={28} />
        <span className="text-sm text-pp-brown truncate">
          {player.displayName}
          {player.uid === currentUid && (
            <span className="text-pp-brown/50"> (tú)</span>
          )}
        </span>
      </div>
      {extra && (
        <span className="text-xs text-pp-brown/60 shrink-0 text-right">
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
  const totalRegistered = registered.length;

  const active = registered
    .filter((p) => p.status === "active")
    .sort((a, b) => b.chips - a.chips);

  const eliminated = registered
    .filter((p) => p.status === "eliminated")
    .sort((a, b) => (b.eliminationOrder ?? 0) - (a.eliminationOrder ?? 0));

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
        {active.map((p, i) => (
          <Row
            key={p.uid}
            rank={`#${i + 1}`}
            player={p}
            currentUid={currentUid}
            extra={[`${formatChips(p.chips)} fichas`, bountyText(p)]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </div>

      {eliminated.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-3 border-t border-pp-green-mid/10">
          <p className="text-xs text-pp-brown/50">Eliminados</p>
          {eliminated.map((p) => {
            const eliminator = registered.find(
              (other) => other.uid === p.eliminatedBy
            );
            return (
              <Row
                key={p.uid}
                rank={`${totalRegistered - (p.eliminationOrder ?? 0) + 1}º`}
                player={p}
                currentUid={currentUid}
                muted
                extra={[
                  eliminator ? `eliminado por ${eliminator.displayName}` : null,
                  bountyText(p),
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
