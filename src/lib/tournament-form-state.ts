// Estado del formulario de torneo, compartido entre "Crear torneo" y
// "Editar torneo" para no duplicar la lógica de conversión.

import type { BlindLevel, ChipDenominations, TournamentSettings } from "@/types/tournament";
import { EMPTY_CHIPS, PANTANO_DEFAULTS } from "@/lib/tournament-defaults";
import type { CreateTournamentInput } from "@/lib/tournaments";

export interface TournamentFormState {
  name: string;
  buyIn: number;
  rebuyAmount: number;
  addonAmount: number;
  bountyPerElimination: number;
  prizeFirst: number;
  prizeSecond: number;
  houseRuleFine: number;
  houseRules: string[];
  chipValues: ChipDenominations;
  startingStack: ChipDenominations;
  addonStack: ChipDenominations;
  blindStructure: BlindLevel[];
  rebuyUntilLevel: number;
  addonLevel: number;
  seatsPerTable: number;
  dealerMode: "fixed" | "rotating";
}

export const BLANK_TOURNAMENT_STATE: TournamentFormState = {
  name: "",
  buyIn: 0,
  rebuyAmount: 0,
  addonAmount: 0,
  bountyPerElimination: 0,
  prizeFirst: 70,
  prizeSecond: 30,
  houseRuleFine: 0,
  houseRules: [],
  chipValues: { ...EMPTY_CHIPS },
  startingStack: { ...EMPTY_CHIPS },
  addonStack: { ...EMPTY_CHIPS },
  blindStructure: [
    { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15 },
  ],
  rebuyUntilLevel: 1,
  addonLevel: 1,
  seatsPerTable: 9,
  dealerMode: "fixed",
};

export const PANTANO_TOURNAMENT_STATE: TournamentFormState = {
  name: PANTANO_DEFAULTS.name,
  buyIn: PANTANO_DEFAULTS.buyIn,
  rebuyAmount: PANTANO_DEFAULTS.rebuyAmount,
  addonAmount: PANTANO_DEFAULTS.addonAmount,
  bountyPerElimination: PANTANO_DEFAULTS.bountyPerElimination,
  prizeFirst: PANTANO_DEFAULTS.prizeSplitFirst,
  prizeSecond: PANTANO_DEFAULTS.prizeSplitSecond,
  houseRuleFine: PANTANO_DEFAULTS.houseRuleFine,
  houseRules: [...PANTANO_DEFAULTS.houseRules],
  chipValues: PANTANO_DEFAULTS.chipValues,
  startingStack: PANTANO_DEFAULTS.startingStack,
  addonStack: PANTANO_DEFAULTS.addonStack,
  blindStructure: PANTANO_DEFAULTS.blindStructure,
  rebuyUntilLevel: PANTANO_DEFAULTS.rebuyUntilLevel,
  addonLevel: PANTANO_DEFAULTS.addonLevel,
  seatsPerTable: PANTANO_DEFAULTS.seatsPerTable,
  dealerMode: PANTANO_DEFAULTS.dealerMode,
};

export function formStateToInput(
  form: TournamentFormState
): CreateTournamentInput {
  return {
    name: form.name.trim() || "Torneo sin nombre",
    buyIn: form.buyIn,
    rebuyAmount: form.rebuyAmount,
    addonAmount: form.addonAmount,
    bountyPerElimination: form.bountyPerElimination,
    prizeSplit: [form.prizeFirst / 100, form.prizeSecond / 100],
    houseRuleFine: form.houseRuleFine,
    houseRules: form.houseRules.map((r) => r.trim()).filter(Boolean),
    chipValues: form.chipValues,
    startingStack: form.startingStack,
    addonStack: form.addonStack,
    blindStructure: form.blindStructure,
    rebuyUntilLevel: form.rebuyUntilLevel,
    addonLevel: form.addonLevel,
    seatsPerTable: form.seatsPerTable,
    dealerMode: form.dealerMode,
  };
}

export function tournamentToFormState(
  t: TournamentSettings
): TournamentFormState {
  return {
    name: t.name,
    buyIn: t.buyIn,
    rebuyAmount: t.rebuyAmount,
    addonAmount: t.addonAmount,
    bountyPerElimination: t.bountyPerElimination,
    prizeFirst: Math.round((t.prizeSplit[0] ?? 0) * 100),
    prizeSecond: Math.round((t.prizeSplit[1] ?? 0) * 100),
    houseRuleFine: t.houseRuleFine,
    houseRules: t.houseRules ?? [],
    chipValues: t.chipValues,
    startingStack: t.startingStack,
    addonStack: t.addonStack,
    blindStructure: t.blindStructure,
    // Torneos creados antes de esta función no tienen estos campos: se
    // asume que las recompras/addon seguían abiertas en cualquier nivel.
    rebuyUntilLevel: t.rebuyUntilLevel ?? t.blindStructure.length,
    addonLevel: t.addonLevel ?? 1,
    seatsPerTable: t.seatsPerTable,
    dealerMode: t.dealerMode,
  };
}
