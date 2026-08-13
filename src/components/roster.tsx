"use client";

import { useState } from "react";
import {
  chipsValue,
  eliminatePlayer,
  registerAddon,
  registerBuyIn,
  registerFine,
  registerRebuy,
  undoLastElimination,
} from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar, Button, Card } from "@/components/ui";

/** Tarjeta del dealer: registrar buy-in, recompra, addon, multas y eliminaciones. */
export function RegistrationCard({
  tournament,
  players,
  tables,
  actingUid,
}: {
  tournament: TournamentSettings;
  players: Player[];
  tables: PokerTable[];
  actingUid: string;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [eliminatingUid, setEliminatingUid] = useState<string | null>(null);
  const [eliminatorChoice, setEliminatorChoice] = useState("");
  const [finingUid, setFiningUid] = useState<string | null>(null);
  const [fineReason, setFineReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chipsPerRebuy = chipsValue(tournament.chipValues, tournament.startingStack);
  // Torneos creados antes de esta función todavía no tienen houseRules en
  // Firestore; se trata como lista vacía hasta que el dueño edite el torneo.
  const houseRules = tournament.houseRules ?? [];
  // Mismo criterio para rebuyUntilLevel/addonLevel: si el torneo es viejo y
  // no los tiene, se asume que recompra/addon siguen abiertos siempre.
  const rebuyUntilLevel = tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const addonLevel = tournament.addonLevel ?? 1;
  const rebuysOpen = tournament.currentLevel <= rebuyUntilLevel;
  const addonOpen = tournament.currentLevel >= addonLevel;

  const run = async (uid: string, action: () => Promise<void>) => {
    setBusyUid(uid);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusyUid(null);
    }
  };

  const confirmElimination = async (target: Player) => {
    setBusyUid(target.uid);
    setError(null);
    try {
      await eliminatePlayer(
        tournament,
        tables,
        target,
        eliminatorChoice || null
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setBusyUid(null);
      setEliminatingUid(null);
      setEliminatorChoice("");
    }
  };

  const confirmFine = async (targetUid: string) => {
    setBusyUid(targetUid);
    setError(null);
    try {
      await registerFine(tournament, targetUid, actingUid, fineReason);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo poner la multa.");
    } finally {
      setBusyUid(null);
      setFiningUid(null);
      setFineReason("");
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
          const isLastElimination =
            p.status === "eliminated" &&
            p.eliminationOrder === tournament.eliminationsCount;

          return (
            <div
              key={p.uid}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.displayName} />
                  <div>
                    <p className="text-sm text-pp-brown">
                      {p.displayName}
                      {p.status === "eliminated" && (
                        <span className="text-pp-brown/50">
                          {" "}
                          · eliminado #{p.eliminationOrder}
                        </span>
                      )}
                    </p>
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
                  ) : p.status === "eliminated" ? (
                    <>
                      {rebuysOpen ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            run(p.uid, () =>
                              registerRebuy(tournament, p.uid, actingUid)
                            )
                          }
                        >
                          Recompra (reingresa)
                        </Button>
                      ) : (
                        <span className="text-xs text-pp-brown/40 self-center">
                          Recompras cerradas (nivel {rebuyUntilLevel})
                        </span>
                      )}
                      {isLastElimination && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            run(p.uid, () =>
                              undoLastElimination(tournament, p)
                            )
                          }
                        >
                          Deshacer eliminación
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy || p.usedAddon || !addonOpen}
                        onClick={() =>
                          run(p.uid, () =>
                            registerAddon(tournament, p.uid, actingUid)
                          )
                        }
                      >
                        {p.usedAddon
                          ? "Addon ✓"
                          : addonOpen
                            ? "Addon"
                            : `Addon (nivel ${addonLevel})`}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setFiningUid(p.uid);
                          setFineReason(houseRules[0] ?? "");
                        }}
                      >
                        Multa
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={busy}
                        onClick={() => setEliminatingUid(p.uid)}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {eliminatingUid === p.uid && (
                <div className="flex items-center gap-2 bg-pp-brown/5 rounded-xl px-3 py-2">
                  <span className="text-xs text-pp-brown/70">
                    ¿Quién lo eliminó?
                  </span>
                  <select
                    className="flex-1 text-xs border border-pp-green-mid/30 rounded-full px-2 py-1 bg-white text-pp-brown"
                    value={eliminatorChoice}
                    onChange={(e) => setEliminatorChoice(e.target.value)}
                  >
                    <option value="">Sin bounty / no se sabe</option>
                    {players
                      .filter(
                        (other) =>
                          other.uid !== p.uid && other.status === "active"
                      )
                      .map((other) => (
                        <option key={other.uid} value={other.uid}>
                          {other.displayName}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => confirmElimination(p)}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEliminatingUid(null);
                      setEliminatorChoice("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {finingUid === p.uid && (
                <div className="flex items-center gap-2 bg-pp-brown/5 rounded-xl px-3 py-2">
                  <span className="text-xs text-pp-brown/70">Motivo</span>
                  {houseRules.length > 0 ? (
                    <select
                      className="flex-1 text-xs border border-pp-green-mid/30 rounded-full px-2 py-1 bg-white text-pp-brown"
                      value={fineReason}
                      onChange={(e) => setFineReason(e.target.value)}
                    >
                      {houseRules.map((rule) => (
                        <option key={rule} value={rule}>
                          {rule}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-xs text-pp-brown/50">
                      No hay motivos configurados. Agrégalos en &quot;Editar
                      torneo&quot;.
                    </span>
                  )}
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => confirmFine(p.uid)}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFiningUid(null);
                      setFineReason("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </Card>
  );
}
