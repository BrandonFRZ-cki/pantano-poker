"use client";

import { useState, type ReactNode } from "react";
import { CHIP_COLOR_HEX, CHIP_COLOR_LABEL } from "@/lib/tournament-defaults";
import type { TournamentFormState } from "@/lib/tournament-form-state";
import { IconChip, IconClock, IconGavel, IconInfo } from "@/components/ui";
import type { BlindLevel, ChipDenominations, ExtraChip } from "@/types/tournament";

type ChipColor = keyof ChipDenominations;
const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as ChipColor[];

function numberInputProps(value: number) {
  return { value: Number.isNaN(value) ? "" : value };
}

const inputClass =
  "rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full";
const labelClass = "text-sm text-pp-brown/70";

function ChipDot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block w-5 h-5 rounded-full border-2 border-dashed shrink-0"
      style={{ backgroundColor: hex, borderColor: "rgba(0,0,0,0.15)" }}
    />
  );
}

function FormSection({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/70 border border-pp-green-mid/15 shadow-sm shadow-pp-green-dark/5 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-pp-green-dark">
          {icon}
          <h2 className="font-display">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Genera una estructura de niveles doblando las ciegas cada N niveles, para no tener que escribir todo a mano. */
function generateBlindStructure(
  startSmall: number,
  durationMinutes: number,
  doubleEvery: number,
  levelCount: number,
  breakEvery: number
): BlindLevel[] {
  const levels: BlindLevel[] = [];
  for (let i = 0; i < levelCount; i++) {
    const doublings = Math.floor(i / Math.max(doubleEvery, 1));
    const factor = Math.pow(2, doublings);
    const smallBlind = Math.round((startSmall * factor) / 5) * 5 || startSmall;
    const bigBlind = smallBlind * 2;
    levels.push({
      level: i + 1,
      smallBlind,
      bigBlind,
      ante: bigBlind,
      durationMinutes,
      isBreak: breakEvery > 0 && (i + 1) % breakEvery === 0,
    });
  }
  return levels;
}

export function TournamentFormFields({
  form,
  setForm,
}: {
  form: TournamentFormState;
  setForm: (updater: (prev: TournamentFormState) => TournamentFormState) => void;
}) {
  const [quickStart, setQuickStart] = useState(25);
  const [quickDuration, setQuickDuration] = useState(15);
  const [quickDoubleEvery, setQuickDoubleEvery] = useState(2);
  const [quickLevels, setQuickLevels] = useState(12);
  const [quickBreakEvery, setQuickBreakEvery] = useState(6);

  const updateChip = (
    group: "chipValues" | "startingStack" | "addonStack",
    color: ChipColor,
    value: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [group]: { ...prev[group], [color]: value },
    }));
  };

  const updateBlindLevel = (
    index: number,
    field: keyof BlindLevel,
    value: number
  ) => {
    setForm((prev) => ({
      ...prev,
      blindStructure: prev.blindStructure.map((lvl, i) =>
        i === index ? { ...lvl, [field]: value } : lvl
      ),
    }));
  };

  const toggleBreakLevel = (index: number, isBreak: boolean) => {
    setForm((prev) => ({
      ...prev,
      blindStructure: prev.blindStructure.map((lvl, i) =>
        i === index ? { ...lvl, isBreak } : lvl
      ),
    }));
  };

  const clampToLength = (lvl: number, length: number) =>
    Math.min(Math.max(lvl, 1), length || 1);

  const addBlindLevel = () => {
    setForm((prev) => {
      const last = prev.blindStructure[prev.blindStructure.length - 1];
      return {
        ...prev,
        blindStructure: [
          ...prev.blindStructure,
          {
            level: prev.blindStructure.length + 1,
            smallBlind: last ? last.smallBlind * 2 : 25,
            bigBlind: last ? last.bigBlind * 2 : 50,
            ante: last ? last.ante * 2 : 0,
            durationMinutes: last?.durationMinutes ?? 15,
          },
        ],
      };
    });
  };

  const removeBlindLevel = (index: number) => {
    setForm((prev) => {
      const blindStructure = prev.blindStructure
        .filter((_, i) => i !== index)
        .map((lvl, i) => ({ ...lvl, level: i + 1 }));
      return {
        ...prev,
        blindStructure,
        rebuyUntilLevel: clampToLength(prev.rebuyUntilLevel, blindStructure.length),
        addonLevel: clampToLength(prev.addonLevel, blindStructure.length),
      };
    });
  };

  const applyQuickFill = () => {
    setForm((prev) => {
      const blindStructure = generateBlindStructure(
        quickStart,
        quickDuration,
        quickDoubleEvery,
        quickLevels,
        quickBreakEvery
      );
      return {
        ...prev,
        blindStructure,
        rebuyUntilLevel: clampToLength(prev.rebuyUntilLevel, blindStructure.length),
        addonLevel: clampToLength(prev.addonLevel, blindStructure.length),
      };
    });
  };

  const updateHouseRule = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      houseRules: prev.houseRules.map((r, i) => (i === index ? value : r)),
    }));
  };

  const addHouseRule = () => {
    setForm((prev) => ({ ...prev, houseRules: [...prev.houseRules, ""] }));
  };

  const removeHouseRule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      houseRules: prev.houseRules.filter((_, i) => i !== index),
    }));
  };

  const updateExtraChip = (
    index: number,
    field: keyof ExtraChip,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      extraChips: prev.extraChips.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addExtraChip = () => {
    setForm((prev) => ({
      ...prev,
      extraChips: [
        ...prev.extraChips,
        {
          id: `extra-${Date.now()}`,
          label: "",
          hex: "#8a4fd6",
          value: 0,
          startingStack: 0,
          addonStack: 0,
        },
      ],
    }));
  };

  const removeExtraChip = (index: number) => {
    setForm((prev) => ({
      ...prev,
      extraChips: prev.extraChips.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      <FormSection icon={<IconInfo />} title="Datos generales">
        <label className={labelClass}>
          Nombre del torneo
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Buy-in ($)
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...numberInputProps(form.buyIn)}
              onChange={(e) =>
                setForm((p) => ({ ...p, buyIn: e.target.valueAsNumber || 0 }))
              }
            />
          </label>
          <label className={labelClass}>
            Recompra ($)
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...numberInputProps(form.rebuyAmount)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  rebuyAmount: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
          <label className={labelClass}>
            Addon ($)
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...numberInputProps(form.addonAmount)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  addonAmount: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Bounty por eliminación ($)
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...numberInputProps(form.bountyPerElimination)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  bountyPerElimination: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
          <label className={labelClass}>
            Multa reglas de la casa ($)
            <input
              type="number"
              min={0}
              step="0.05"
              className={inputClass}
              {...numberInputProps(form.houseRuleFine)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  houseRuleFine: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Tipo de bounty
            <select
              className={inputClass}
              value={form.bountyMode}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  bountyMode: e.target.value as "fixed" | "mystery",
                }))
              }
            >
              <option value="fixed">Normal (se ve el monto)</option>
              <option value="mystery">Misterioso (se revela al final)</option>
            </select>
          </label>
          <label className={labelClass}>
            Bono líder de fichas en el receso ($, opcional)
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...numberInputProps(form.chipLeaderBonus)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  chipLeaderBonus: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
        </div>
        <p className="text-xs text-pp-brown/50 -mt-2">
          El bounty se paga siempre; con &quot;misterioso&quot; los jugadores
          no ven cuánto ganó cada quien hasta el resumen final. El bono de
          líder de fichas se lo lleva quien tenga más fichas justo al cerrar
          recompras/addon (nadie si hay empate).
        </p>

        <div className="flex flex-col gap-2 pt-2 border-t border-pp-green-mid/10">
          <p className={labelClass}>Reparto de premios</p>
          <p className="text-xs text-pp-brown/50">
            Cuántos puestos pagan y qué % le toca a cada uno se calculan
            solos según cuántos jugadores entren (tabla estándar de torneos
            garantizados) — no hace falta configurarlo a mano.
          </p>
          <label className={labelClass}>
            Monto garantizado para el 1er puesto ($, opcional)
            <input
              type="number"
              min={0}
              step="1"
              className={inputClass}
              {...numberInputProps(form.guaranteedFirstPlace)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  guaranteedFirstPlace: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
          <p className="text-xs text-pp-brown/50">
            Si lo dejas en 0, el reparto es puro porcentaje. Si pones un
            monto, el 1er puesto se asegura esa plata y el resto se reparte
            con lo que sobre — a menos que el bote todavía no llegue a cubrir
            la garantía, ahí se usa el porcentaje mientras tanto.
          </p>
        </div>

        <label className={labelClass}>
          Jugadores por mesa
          <input
            type="number"
            min={2}
            className={inputClass}
            {...numberInputProps(form.seatsPerTable)}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                seatsPerTable: e.target.valueAsNumber || 0,
              }))
            }
          />
        </label>
        <label className={labelClass}>
          ¿Quién puede ser dealer?
          <select
            className={inputClass}
            value={form.dealerMode}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                dealerMode: e.target.value as "fixed" | "rotating",
              }))
            }
          >
            <option value="fixed">
              Dealer fijo (tú eliges quién controla el timer)
            </option>
            <option value="rotating">
              Dealer rotativo (cualquier jugador puede serlo)
            </option>
          </select>
        </label>
        <label className={labelClass}>
          Rotar dealers entre mesas cada cuántos niveles (0 = nunca)
          <input
            type="number"
            min={0}
            className={inputClass}
            {...numberInputProps(form.dealerRotationLevels)}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                dealerRotationLevels: e.target.valueAsNumber || 0,
              }))
            }
          />
        </label>
      </FormSection>

      <FormSection icon={<IconChip />} title="Fichas">
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr] gap-2 text-xs text-pp-brown/60 px-1">
          <span></span>
          <span>Valor</span>
          <span>Stack inicial</span>
          <span>Addon</span>
        </div>
        {CHIP_COLORS.map((color) => (
          <div key={color} className="grid grid-cols-[1.5rem_1fr_1fr_1fr] gap-2 items-center">
            <ChipDot hex={CHIP_COLOR_HEX[color]} />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(form.chipValues[color])}
              onChange={(e) =>
                updateChip("chipValues", color, e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(form.startingStack[color])}
              onChange={(e) =>
                updateChip("startingStack", color, e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(form.addonStack[color])}
              onChange={(e) =>
                updateChip("addonStack", color, e.target.valueAsNumber || 0)
              }
            />
          </div>
        ))}
        <p className="text-xs text-pp-brown/40 -mt-1">
          {CHIP_COLORS.map((c) => CHIP_COLOR_LABEL[c]).join(" · ")}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-pp-green-mid/10">
          <p className={labelClass}>Colores extra</p>
          <button
            type="button"
            onClick={addExtraChip}
            className="text-sm text-pp-green-dark underline"
          >
            + Agregar color
          </button>
        </div>
        {form.extraChips.length === 0 && (
          <p className="text-sm text-pp-brown/60">
            Los 5 colores de arriba no alcanzan? Agrega los que necesites,
            con su propio color.
          </p>
        )}
        {form.extraChips.map((chip, index) => (
          <div
            key={chip.id}
            className="grid grid-cols-[1.5rem_1fr_4.5rem_4.5rem_4.5rem_1.5rem] gap-2 items-center"
          >
            <input
              type="color"
              value={chip.hex}
              onChange={(e) => updateExtraChip(index, "hex", e.target.value)}
              className="w-6 h-6 rounded-full border-0 p-0 bg-transparent cursor-pointer"
              aria-label="Color de la ficha"
            />
            <input
              className={inputClass}
              placeholder="Nombre"
              value={chip.label}
              onChange={(e) => updateExtraChip(index, "label", e.target.value)}
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Valor"
              {...numberInputProps(chip.value)}
              onChange={(e) =>
                updateExtraChip(index, "value", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Stack"
              {...numberInputProps(chip.startingStack)}
              onChange={(e) =>
                updateExtraChip(index, "startingStack", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Addon"
              {...numberInputProps(chip.addonStack)}
              onChange={(e) =>
                updateExtraChip(index, "addonStack", e.target.valueAsNumber || 0)
              }
            />
            <button
              type="button"
              onClick={() => removeExtraChip(index)}
              className="text-pp-brown/40 hover:text-red-700"
              aria-label={`Sacar color ${chip.label || index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </FormSection>

      <FormSection
        icon={<IconClock />}
        title="Estructura de ciegas"
        action={
          <button
            type="button"
            onClick={addBlindLevel}
            className="text-sm text-pp-green-dark underline"
          >
            + Agregar nivel
          </button>
        }
      >
        <div className="flex flex-col gap-2 rounded-xl bg-pp-brown/5 px-3 py-3">
          <p className="text-xs font-medium text-pp-brown/70">
            Relleno rápido (arma toda la tabla de una vez, después la puedes
            ajustar nivel por nivel)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <label className="text-xs text-pp-brown/60">
              Ciega chica inicial
              <input
                type="number"
                min={1}
                className={inputClass}
                value={quickStart}
                onChange={(e) => setQuickStart(e.target.valueAsNumber || 0)}
              />
            </label>
            <label className="text-xs text-pp-brown/60">
              Minutos por nivel
              <input
                type="number"
                min={1}
                className={inputClass}
                value={quickDuration}
                onChange={(e) => setQuickDuration(e.target.valueAsNumber || 0)}
              />
            </label>
            <label className="text-xs text-pp-brown/60">
              Duplicar cada
              <input
                type="number"
                min={1}
                className={inputClass}
                value={quickDoubleEvery}
                onChange={(e) =>
                  setQuickDoubleEvery(e.target.valueAsNumber || 1)
                }
              />
            </label>
            <label className="text-xs text-pp-brown/60">
              Cantidad de niveles
              <input
                type="number"
                min={1}
                className={inputClass}
                value={quickLevels}
                onChange={(e) => setQuickLevels(e.target.valueAsNumber || 1)}
              />
            </label>
            <label className="text-xs text-pp-brown/60">
              Receso cada (0 = ninguno)
              <input
                type="number"
                min={0}
                className={inputClass}
                value={quickBreakEvery}
                onChange={(e) =>
                  setQuickBreakEvery(e.target.valueAsNumber || 0)
                }
              />
            </label>
          </div>
          <button
            type="button"
            onClick={applyQuickFill}
            className="self-start text-sm font-medium text-pp-green-dark underline"
          >
            Generar tabla (reemplaza los niveles de abajo)
          </button>
        </div>

        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_3.5rem_2rem] gap-2 text-xs text-pp-brown/60 px-1">
          <span>#</span>
          <span>Chica</span>
          <span>Grande</span>
          <span>Ante</span>
          <span>Min.</span>
          <span>Receso</span>
          <span></span>
        </div>
        {form.blindStructure.map((lvl, index) => (
          <div
            key={index}
            className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_3.5rem_2rem] gap-2 items-center"
          >
            <span className="text-sm text-pp-brown/60">{lvl.level}</span>
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(lvl.smallBlind)}
              onChange={(e) =>
                updateBlindLevel(index, "smallBlind", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(lvl.bigBlind)}
              onChange={(e) =>
                updateBlindLevel(index, "bigBlind", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={0}
              className={inputClass}
              {...numberInputProps(lvl.ante)}
              onChange={(e) =>
                updateBlindLevel(index, "ante", e.target.valueAsNumber || 0)
              }
            />
            <input
              type="number"
              min={1}
              className={inputClass}
              {...numberInputProps(lvl.durationMinutes)}
              onChange={(e) =>
                updateBlindLevel(
                  index,
                  "durationMinutes",
                  e.target.valueAsNumber || 0
                )
              }
            />
            <input
              type="checkbox"
              className="justify-self-center h-4 w-4 accent-pp-green-dark"
              checked={!!lvl.isBreak}
              onChange={(e) => toggleBreakLevel(index, e.target.checked)}
              aria-label={`Nivel ${lvl.level} es receso`}
            />
            <button
              type="button"
              onClick={() => removeBlindLevel(index)}
              className="text-pp-brown/40 hover:text-red-700"
              aria-label={`Eliminar nivel ${lvl.level}`}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="rounded-xl bg-pp-brown/5 px-3 py-2.5 mt-2">
          {(() => {
            const breakLvl = form.blindStructure.find((lvl) => lvl.isBreak);
            return breakLvl ? (
              <p className="text-sm text-pp-brown">
                El receso, la última recompra y la ventana de addon van
                juntos: todo pasa en el nivel {breakLvl.level} (
                {breakLvl.smallBlind}/{breakLvl.bigBlind}).
              </p>
            ) : (
              <p className="text-sm text-pp-brown">
                Todavía no marcaste ningún nivel como &quot;receso&quot; — sin
                eso, las recompras y el addon quedan abiertos hasta el
                último nivel.
              </p>
            );
          })()}
          <p className="text-xs text-pp-brown/50 mt-1">
            Marca el check de &quot;receso&quot; en la fila que corresponda
            (por ejemplo el corte de las 10pm): ahí se corta la última
            recompra y se abre el addon, todo en el mismo momento.
          </p>
        </div>
      </FormSection>

      <FormSection
        icon={<IconGavel />}
        title="Reglas de la casa (motivos de multa)"
        action={
          <button
            type="button"
            onClick={addHouseRule}
            className="text-sm text-pp-green-dark underline"
          >
            + Agregar motivo
          </button>
        }
      >
        <p className="text-xs text-pp-brown/50">
          Estos motivos van a aparecer en un combobox cuando el dealer ponga
          una multa. Todos cobran el mismo monto de arriba.
        </p>
        {form.houseRules.length === 0 && (
          <p className="text-sm text-pp-brown/60">
            Todavía no agregaste ningún motivo.
          </p>
        )}
        {form.houseRules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={inputClass}
              value={rule}
              placeholder="Ej. Jugar fuera de turno"
              onChange={(e) => updateHouseRule(index, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeHouseRule(index)}
              className="text-pp-brown/40 hover:text-red-700"
              aria-label={`Eliminar motivo ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
      </FormSection>
    </>
  );
}
