"use client";

import type { ReactNode } from "react";
import { CHIP_COLOR_LABEL } from "@/lib/tournament-defaults";
import type { TournamentFormState } from "@/lib/tournament-form-state";
import { IconChip, IconClock, IconGavel, IconInfo } from "@/components/ui";
import type { BlindLevel, ChipDenominations } from "@/types/tournament";

type ChipColor = keyof ChipDenominations;
const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as ChipColor[];

function numberInputProps(value: number) {
  return { value: Number.isNaN(value) ? "" : value };
}

const inputClass =
  "rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full";
const labelClass = "text-sm text-pp-brown/70";

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

export function TournamentFormFields({
  form,
  setForm,
}: {
  form: TournamentFormState;
  setForm: (updater: (prev: TournamentFormState) => TournamentFormState) => void;
}) {
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
      const clampLevel = (lvl: number) =>
        Math.min(Math.max(lvl, 1), blindStructure.length || 1);
      return {
        ...prev,
        blindStructure,
        rebuyUntilLevel: clampLevel(prev.rebuyUntilLevel),
        addonLevel: clampLevel(prev.addonLevel),
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

  const levelLabel = (lvl: BlindLevel) =>
    `Nivel ${lvl.level} — ${lvl.smallBlind}/${lvl.bigBlind}${lvl.isBreak ? " (receso)" : ""}`;

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
              step="0.5"
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
            Reparto 1º puesto (%)
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              {...numberInputProps(form.prizeFirst)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  prizeFirst: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
          <label className={labelClass}>
            Reparto 2º puesto (%)
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              {...numberInputProps(form.prizeSecond)}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  prizeSecond: e.target.valueAsNumber || 0,
                }))
              }
            />
          </label>
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
      </FormSection>

      <FormSection icon={<IconChip />} title="Fichas">
        <div className="grid grid-cols-4 gap-2 text-xs text-pp-brown/60 px-1">
          <span>Color</span>
          <span>Valor</span>
          <span>Stack inicial</span>
          <span>Addon</span>
        </div>
        {CHIP_COLORS.map((color) => (
          <div key={color} className="grid grid-cols-4 gap-2 items-center">
            <span className="text-sm text-pp-brown">
              {CHIP_COLOR_LABEL[color]}
            </span>
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

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-pp-green-mid/10">
          <label className={labelClass}>
            Recompras/reingresos hasta
            <select
              className={inputClass}
              value={form.rebuyUntilLevel}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  rebuyUntilLevel: Number(e.target.value) || 1,
                }))
              }
            >
              {form.blindStructure.map((lvl) => (
                <option key={lvl.level} value={lvl.level}>
                  {levelLabel(lvl)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Addon disponible desde
            <select
              className={inputClass}
              value={form.addonLevel}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  addonLevel: Number(e.target.value) || 1,
                }))
              }
            >
              {form.blindStructure.map((lvl) => (
                <option key={lvl.level} value={lvl.level}>
                  {levelLabel(lvl)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-pp-brown/50">
          Después del nivel elegido, &quot;Recompra&quot; se deja de ofrecer a
          los eliminados. El addon se habilita a partir del nivel elegido
          (marca esa fila como &quot;receso&quot; si coincide con el corte de
          las 10pm).
        </p>
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
