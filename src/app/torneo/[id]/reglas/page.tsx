"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { subscribeToTournament } from "@/lib/tournaments";
import type { TournamentSettings } from "@/types/tournament";
import { CHIP_COLOR_HEX, CHIP_COLOR_LABEL } from "@/lib/tournament-defaults";
import { formatMoney } from "@/lib/format";
import {
  Card,
  IconArrowLeft,
  IconChip,
  IconClock,
  IconGavel,
  IconInfo,
} from "@/components/ui";
import { LoadingScreen } from "@/components/loading";

function ChipDot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-black/10 shrink-0"
      style={{ backgroundColor: hex }}
    />
  );
}

export default function ReglasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [tournament, setTournament] = useState<TournamentSettings | null>(
    null
  );
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  useEffect(() => {
    const unsub = subscribeToTournament(id, (t) => {
      setTournament(t);
      setFetching(false);
    });
    return unsub;
  }, [id]);

  if (loading || !firebaseUser || fetching) {
    return <LoadingScreen />;
  }

  if (!tournament) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-4">
        <p className="text-pp-brown/80">No encontramos este torneo.</p>
        <Link href="/panel" className="text-pp-green-dark underline">
          Volver a mis torneos
        </Link>
      </div>
    );
  }

  const houseRules = tournament.houseRules ?? [];
  const rebuyUntilLevel =
    tournament.rebuyUntilLevel ?? tournament.blindStructure.length;
  const addonLevel = tournament.addonLevel ?? 1;
  const entriesClosed =
    tournament.status === "finished" ||
    tournament.currentLevel > Math.max(rebuyUntilLevel, addonLevel);
  const bountyMode = tournament.bountyMode ?? "fixed";

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between w-full">
          <Link
            href={`/torneo/${id}`}
            className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
          >
            <IconArrowLeft />
            Volver al torneo
          </Link>
        </div>

        <h1 className="font-display text-2xl text-pp-green-dark text-center">
          Reglas de {tournament.name}
        </h1>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-pp-green-dark">
            <IconInfo />
            <p className="text-sm font-medium">Dinero</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-pp-brown/50">Buy-in</p>
              <p className="font-display text-pp-green-dark">
                {formatMoney(tournament.buyIn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-pp-brown/50">Recompra</p>
              <p className="font-display text-pp-green-dark">
                {formatMoney(tournament.rebuyAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-pp-brown/50">Addon</p>
              <p className="font-display text-pp-green-dark">
                {formatMoney(tournament.addonAmount)}
              </p>
            </div>
          </div>
          <p className="text-xs text-pp-brown/50">
            Última recompra y addon, juntos, en el nivel{" "}
            {tournament.rebuyUntilLevel} (el receso). Después de ese nivel
            ya no se puede ni recomprar ni hacer addon.
          </p>
          <p className="text-xs text-pp-brown/50">
            Bounty por eliminación:{" "}
            {entriesClosed
              ? bountyMode === "mystery"
                ? "misterioso (se revela al final)"
                : formatMoney(tournament.bountyPerElimination)
              : "se revela al cerrarse las recompras/addon"}{" "}
            (incluido en cada pago, no es extra).
          </p>
          {tournament.chipLeaderBonus > 0 && (
            <p className="text-xs text-pp-brown/50">
              👑 Bono de {formatMoney(tournament.chipLeaderBonus)} para quien
              tenga más fichas al cerrar recompras/addon (nadie si hay
              empate).
            </p>
          )}
          <p className="text-xs text-pp-brown/50">
            Cuántos puestos pagan y cuánto le toca a cada uno se calcula
            automático según cuántos jugadores entren.
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-pp-green-dark">
            <IconInfo />
            <p className="text-sm font-medium">Cómo se calculan los premios</p>
          </div>
          <p className="text-sm text-pp-brown/80">
            El bote es todo lo recaudado (inscripciones, recompras y addons)
            menos el bounty que ya se pagó por las eliminaciones. Eso quiere
            decir que el bote que se reparte en premios{" "}
            <span className="font-medium">baja cada vez que se elimina a alguien con bounty</span>
            , aunque nadie retire plata: esa parte ya quedó separada para
            quien hizo la eliminación.
          </p>
          <div className="rounded-xl bg-pp-brown/5 px-3 py-2.5 text-xs text-pp-brown/70 flex flex-col gap-1">
            <p className="font-medium text-pp-brown">Ejemplo</p>
            <p>
              Supongamos un bote de {formatMoney(15)} y un bounty de{" "}
              {formatMoney(tournament.bountyPerElimination || 1)} por
              eliminación.
            </p>
            <p>
              Recién armado el torneo: {formatMoney(15)} para repartir.
            </p>
            <p>
              Eliminan al primer jugador y se acredita el bounty: quedan{" "}
              {formatMoney(15 - (tournament.bountyPerElimination || 1))} para
              premios.
            </p>
            <p>
              Eliminan a otro con bounty: quedan{" "}
              {formatMoney(
                15 - (tournament.bountyPerElimination || 1) * 2
              )}
              . Y así con cada eliminación con bounty acreditado.
            </p>
          </div>
          <p className="text-sm text-pp-brown/80">
            Cuántos puestos pagan y qué % le toca a cada uno sale de una
            tabla estándar según cuántos jugadores entraron en total (no se
            configura a mano). Si hay un monto garantizado para el 1er
            puesto, se lo lleva completo apenas el bote lo cubre, y el resto
            se reparte con lo que sobra.
          </p>
          <p className="text-sm text-pp-brown/80">
            La &quot;burbuja de premios&quot; (en la pantalla del torneo) ya
            tiene en cuenta que, si hay N jugadores, exactamente N-1 van a
            ser eliminados y solo 1 puede ganar: por eso cada puesto se va
            marcando como decidido apenas alguien es eliminado ahí, en vez
            de mostrar una posición que todavía puede cambiar.
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-pp-green-dark">
            <IconChip />
            <p className="text-sm font-medium">Fichas</p>
          </div>
          <div className="grid grid-cols-[1.25rem_1fr_1fr_1fr_1fr] gap-2 text-xs text-pp-brown/50 px-1">
            <span></span>
            <span>Color</span>
            <span>Valor</span>
            <span>Stack</span>
            <span>Addon</span>
          </div>
          {(Object.keys(CHIP_COLOR_LABEL) as (keyof typeof CHIP_COLOR_LABEL)[]).map(
            (color) => (
              <div
                key={color}
                className="grid grid-cols-[1.25rem_1fr_1fr_1fr_1fr] gap-2 items-center"
              >
                <ChipDot hex={CHIP_COLOR_HEX[color]} />
                <span className="text-sm text-pp-brown">
                  {CHIP_COLOR_LABEL[color]}
                </span>
                <span className="text-sm text-pp-brown/70">
                  {tournament.chipValues[color]}
                </span>
                <span className="text-sm text-pp-brown/70">
                  {tournament.startingStack[color]}
                </span>
                <span className="text-sm text-pp-brown/70">
                  {tournament.addonStack[color]}
                </span>
              </div>
            )
          )}
          {(tournament.extraChips ?? []).map((chip) => (
            <div
              key={chip.id}
              className="grid grid-cols-[1.25rem_1fr_1fr_1fr_1fr] gap-2 items-center"
            >
              <ChipDot hex={chip.hex} />
              <span className="text-sm text-pp-brown">{chip.label}</span>
              <span className="text-sm text-pp-brown/70">{chip.value}</span>
              <span className="text-sm text-pp-brown/70">
                {chip.startingStack}
              </span>
              <span className="text-sm text-pp-brown/70">
                {chip.addonStack}
              </span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-pp-green-dark">
            <IconClock />
            <p className="text-sm font-medium">Estructura de ciegas</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-pp-brown/50 px-1">
            <span>Nivel</span>
            <span>Ciegas</span>
            <span>Ante</span>
            <span>Min.</span>
          </div>
          {tournament.blindStructure.map((lvl) => (
            <div
              key={lvl.level}
              className={`grid grid-cols-4 gap-2 items-center text-sm ${
                lvl.level === tournament.currentLevel
                  ? "text-pp-green-dark font-medium"
                  : "text-pp-brown/70"
              }`}
            >
              <span>
                {lvl.level}
                {lvl.isBreak && (
                  <span className="text-pp-brown/40"> · receso</span>
                )}
              </span>
              <span>
                {lvl.smallBlind}/{lvl.bigBlind}
              </span>
              <span>{lvl.ante}</span>
              <span>{lvl.durationMinutes}</span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-pp-green-dark">
            <IconGavel />
            <p className="text-sm font-medium">
              Reglas de la casa (multas de {formatMoney(tournament.houseRuleFine)})
            </p>
          </div>
          {houseRules.length === 0 ? (
            <p className="text-sm text-pp-brown/60">
              Todavía no hay reglas configuradas.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm text-pp-brown/80 list-disc list-inside">
              {houseRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
