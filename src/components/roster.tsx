"use client";

import { useState } from "react";
import {
  chipsValue,
  registerAddon,
  registerBuyIn,
  registerFine,
  registerRebuy,
} from "@/lib/tournaments";
import type { Player, TournamentSettings } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar, Button, Card } from "@/components/ui";

/** Tarjeta del dealer: registrar buy-in, recompra, addon y multas por jugador. */
export function RegistrationCard({
  tournament,
  players,
  actingUid,
}: {
  tournament: TournamentSettings;
  players: Player[];
  actingUid: string;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const chipsPerRebuy = chipsValue(tournament.chipValues, tournament.startingStack);

  const run = async (uid: string, action: () => Promise<void>) => {
    setBusyUid(uid);
    try {
      await action();
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-medium text-pp-brown/70">
        Registro de fichas
      </p>
      {players.length === 0 && (
        <p className="text-sm text-pp-brown/60 text-center py-2">
          Todavía no se unió nadie.
        </p>
      )}
      <div className="flex flex-col divide-y divide-pp-green-mid/10">
        {players.map((p) => {
          const busy = busyUid === p.uid;
          return (
            <div
              key={p.uid}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.displayName} />
                <div>
                  <p className="text-sm text-pp-brown">{p.displayName}</p>
                  <p className="text-xs text-pp-brown/50">
                    {p.buyInAt
                      ? [
                          `${formatChips(p.chips)} fichas`,
                          p.rebuyCount
                            ? `${p.rebuyCount} recompra${p.rebuyCount > 1 ? "s" : ""} (${formatChips(p.rebuyCount * chipsPerRebuy)})`
                            : null,
                          p.usedAddon ? "addon" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Sin registrar"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {!p.buyInAt ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(p.uid, () =>
                        registerBuyIn(tournament, p.uid, actingUid)
                      )
                    }
                  >
                    Buy-in
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || p.status === "eliminated"}
                      onClick={() =>
                        run(p.uid, () =>
                          registerRebuy(tournament, p.uid, actingUid)
                        )
                      }
                    >
                      Recompra
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy || p.usedAddon}
                      onClick={() =>
                        run(p.uid, () =>
                          registerAddon(tournament, p.uid, actingUid)
                        )
                      }
                    >
                      {p.usedAddon ? "Addon ✓" : "Addon"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        run(p.uid, () =>
                          registerFine(
                            tournament,
                            p.uid,
                            actingUid,
                            window.prompt("Motivo de la multa (opcional)") ??
                              undefined
                          )
                        )
                      }
                    >
                      Multa
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
