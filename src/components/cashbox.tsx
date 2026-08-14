"use client";

import type { Transaction } from "@/types/tournament";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  buyin: "Inscripciones",
  rebuy: "Recompras",
  addon: "Addons",
  fine: "Multas",
};

/**
 * Tarjeta solo para dealer/dueño: cuánto se lleva recaudado en total,
 * separado por tipo (inscripciones, recompras, addons, multas). A
 * diferencia de "Bote y premios" (que se muestra al público recién cuando
 * cierran las recompras/addon), esta siempre está al día, para que el
 * dealer sepa cómo va la caja en cualquier momento.
 */
export function CashboxCard({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return null;

  const types: Transaction["type"][] = ["buyin", "rebuy", "addon", "fine"];
  const totals = types.map((type) => ({
    type,
    total: transactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0),
    count: transactions.filter((t) => t.type === type).length,
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-pp-brown/70">
          Caja del dealer (todo lo recaudado)
        </p>
        <span className="font-display text-lg text-pp-green-dark">
          {formatMoney(grandTotal)}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {totals
          .filter((t) => t.count > 0)
          .map((t) => (
            <div
              key={t.type}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-pp-brown/70">
                {TYPE_LABEL[t.type]}{" "}
                <span className="text-pp-brown/40">
                  ({t.count})
                </span>
              </span>
              <span className="text-pp-brown font-medium">
                {formatMoney(t.total)}
              </span>
            </div>
          ))}
      </div>
      <p className="text-xs text-pp-brown/40">
        Este total incluye todo (incluido el bounty todavía no pagado);
        no es lo mismo que el bote que se reparte en premios.
      </p>
    </Card>
  );
}
