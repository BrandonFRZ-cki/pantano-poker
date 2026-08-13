"use client";

import { computeBlindSeats, seatPositions } from "@/lib/table-order";
import type { Player, PokerTable } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar } from "@/components/ui";

function nameFor(players: Player[], uid: string): Player | undefined {
  return players.find((p) => p.uid === uid);
}

/** Dibuja la mesa en óvalo con cada jugador en su asiento, botón/SB/BB y turno actual. */
export function SeatDiagram({
  table,
  players,
  currentUid,
}: {
  table: PokerTable;
  players: Player[];
  currentUid: string;
}) {
  const blinds = computeBlindSeats(table);
  const positions = seatPositions(table.playerIds.length);

  return (
    <div className="relative w-full aspect-[5/3] max-w-xl mx-auto">
      <div className="absolute inset-[8%] rounded-[999px] bg-pp-green-dark/90 border-4 border-pp-brown/20 shadow-inner" />

      {table.playerIds.map((uid, i) => {
        const player = nameFor(players, uid);
        if (!player) return null;
        const pos = positions[i];
        const isButton = blinds?.buttonUid === uid;
        const isSb = blinds?.sbUid === uid && !isButton;
        const isBb = blinds?.bbUid === uid;
        const isTurn = table.currentActorUid === uid;
        const isMe = uid === currentUid;

        return (
          <div
            key={uid}
            className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${
                isTurn
                  ? "bg-pp-green-light/40 ring-2 ring-pp-green-dark"
                  : "bg-white/90"
              }`}
            >
              <div className="relative">
                <Avatar name={player.displayName} size={32} />
                {isButton && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-pp-brown text-[9px] font-bold text-pp-cream">
                    D
                  </span>
                )}
              </div>
              <span className="text-[11px] text-pp-brown text-center leading-tight max-w-[5rem] truncate">
                {player.displayName}
                {isMe && <span className="text-pp-brown/50"> (tú)</span>}
              </span>
              <span className="text-[10px] text-pp-brown/60">
                {formatChips(player.chips)}
              </span>
              {(isSb || isBb) && (
                <span className="text-[9px] font-medium text-pp-green-dark">
                  {isSb ? "SB" : "BB"}
                </span>
              )}
              {player.revealedHand && player.revealedHand.length > 0 && (
                <span className="text-[10px] font-medium text-pp-brown">
                  {player.revealedHand.join(" ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
