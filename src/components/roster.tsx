"use client";

import { useState } from "react";
import Link from "next/link";
import {
  chipsValue,
  createLocalPlayer,
  eliminatePlayer,
  extraChipsValue,
  registerAddon,
  registerBuyIn,
  registerFine,
  registerRebuy,
  undoLastElimination,
  updatePlayerChips,
} from "@/lib/tournaments";
import type { Player, PokerTable, TournamentSettings } from "@/types/tournament";
import { formatChips } from "@/lib/format";
import { Avatar, Badge, Button, Card } from "@/components/ui";

/**
 * Candidatos a "quién lo eliminó": solo jugadores activos de la misma mesa
 * (un all-in solo lo gana alguien que estaba en esa mano). Si el dealer es
 * fijo (no juega), se lo excluye aunque por algún motivo tenga buy-in. Y si
 * ya se retiró (fold) en la mano actual, tampoco pudo haber sido quien
 * eliminó a nadie en esa mano.
 */
function sameTableActivePlayers(
  target: Player,
  players: Player[],
  tables: PokerTable[],
  tournament: TournamentSettings
): Player[] {
  const table = tables.find((t) => t.playerIds.includes(target.uid));
  if (!table) return [];
  const folded = table.foldedUids ?? [];
  return players.filter(
    (other) =>
      other.status === "active" &&
      !!other.buyInAt &&
      table.playerIds.includes(other.uid) &&
      !folded.includes(other.uid) &&
      !(
        tournament.dealerMode === "fixed" &&
        tournament.dealerUids.includes(other.uid)
      )
  );
}

/** Tarjeta del dealer: registrar buy-in, recompra, addon, multas y eliminaciones. */
export function RegistrationCard({
  tournament,
  players,
  tables,
  actingUid,
  isOwner,
}: {
  tournament: TournamentSettings;
  players: Player[];
  tables: PokerTable[];
  actingUid: string;
  isOwner: boolean;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [eliminatingUid, setEliminatingUid] = useState<string | null>(null);
  const [eliminatorChoice, setEliminatorChoice] = useState("");
  const [finingUid, setFiningUid] = useState<string | null>(null);
  const [fineReason, setFineReason] = useState("");
  const [editingStackUid, setEditingStackUid] = useState<string | null>(null);
  const [stackValue, setStackValue] = useState("");
  const [newLocalName, setNewLocalName] = useState("");
  const [creatingLocal, setCreatingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chipsPerRebuy =
    chipsValue(tournament.chipValues, tournament.startingStack) +
    extraChipsValue(tournament.extraChips ?? [], "startingStack");
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
        eliminatorChoice || null,
        players
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

  const confirmStack = async (targetUid: string) => {
    const chips = Number(stackValue);
    if (Number.isNaN(chips)) {
      setError("Ingresa un número válido de fichas.");
      return;
    }
    setBusyUid(targetUid);
    setError(null);
    try {
      await updatePlayerChips(tournament.id, targetUid, chips);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el stack."
      );
    } finally {
      setBusyUid(null);
      setEditingStackUid(null);
      setStackValue("");
    }
  };

  const handleCreateLocal = async () => {
    if (!newLocalName.trim()) return;
    setCreatingLocal(true);
    setError(null);
    try {
      await createLocalPlayer(tournament.id, newLocalName);
      setNewLocalName("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo crear el jugador."
      );
    } finally {
      setCreatingLocal(false);
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

      {isOwner && (
        <div className="flex items-center gap-2 bg-pp-brown/5 rounded-xl px-3 py-2">
          <input
            className="flex-1 text-sm border border-pp-green-mid/30 rounded-full px-3 py-1.5 bg-white text-pp-brown outline-none focus:border-pp-green-dark"
            placeholder="Nombre del jugador sin celular"
            value={newLocalName}
            onChange={(e) => setNewLocalName(e.target.value)}
          />
          <Button
            size="sm"
            disabled={creatingLocal || !newLocalName.trim()}
            onClick={handleCreateLocal}
          >
            {creatingLocal ? "Creando…" : "+ Agregar"}
          </Button>
        </div>
      )}

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
          const eliminator = p.eliminatedBy
            ? players.find((other) => other.uid === p.eliminatedBy)
            : null;

          return (
            <div
              key={p.uid}
              className={`flex flex-col gap-2 py-3 px-2 first:pt-0 last:pb-0 rounded-lg ${
                p.status === "eliminated"
                  ? "bg-red-50 border border-red-200/60"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.displayName} />
                  <div>
                    <p
                      className={`text-sm ${p.status === "eliminated" ? "text-red-800" : "text-pp-brown"}`}
                    >
                      {p.displayName}
                      {p.isLocal && (
                        <Badge tone="neutral">sin cuenta</Badge>
                      )}
                      {p.status === "eliminated" && (
                        <span className="text-red-700/70">
                          {" "}
                          · eliminado #{p.eliminationOrder}
                          {eliminator && ` por ${eliminator.displayName}`}
                        </span>
                      )}
                      {p.status === "eliminated" && p.rebuyRequestedAt && (
                        <Badge tone="dealer">🙋 pidió recompra</Badge>
                      )}
                    </p>
                    {isOwner && p.isLocal && (
                      <Link
                        href={`/torneo/${tournament.id}/mesa?viewAs=${p.uid}`}
                        className="text-xs text-pp-green-dark/70 underline"
                      >
                        Ver mesa como {p.displayName}
                      </Link>
                    )}
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
                      {p.buyInAt && p.status === "active" && (
                        <button
                          type="button"
                          className="ml-1.5 text-pp-green-dark/70 underline"
                          onClick={() => {
                            setEditingStackUid(p.uid);
                            setStackValue(String(p.chips));
                          }}
                        >
                          editar
                        </button>
                      )}
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
                          registerBuyIn(tournament, p.uid, actingUid, tables)
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
                              registerRebuy(
                                tournament,
                                p.uid,
                                actingUid,
                                tables
                              )
                            )
                          }
                        >
                          {p.rebuyRequestedAt
                            ? "Aprobar recompra"
                            : "Recompra (reingresa)"}
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
                    {sameTableActivePlayers(p, players, tables, tournament)
                      .filter((other) => other.uid !== p.uid)
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
              {editingStackUid === p.uid && (
                <div className="flex items-center gap-2 bg-pp-brown/5 rounded-xl px-3 py-2">
                  <span className="text-xs text-pp-brown/70">Fichas</span>
                  <input
                    type="number"
                    min={0}
                    className="flex-1 text-xs border border-pp-green-mid/30 rounded-full px-2 py-1 bg-white text-pp-brown"
                    value={stackValue}
                    onChange={(e) => setStackValue(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => confirmStack(p.uid)}
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingStackUid(null);
                      setStackValue("");
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
