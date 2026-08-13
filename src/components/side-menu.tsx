"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconHome,
  IconMenu,
  IconTable,
  IconUser,
  IconX,
} from "@/components/ui";

/**
 * Botón de rayitas en el header + menú lateral (drawer). Reemplaza al
 * tabbar de abajo, que se veía apretado tanto en celular como en
 * computadora.
 */
export function SideMenu({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  const items = [
    {
      href: `/cuenta?from=${tournamentId}`,
      icon: <IconUser />,
      label: "Cuenta",
      active: pathname === "/cuenta",
    },
    {
      href: `/torneo/${tournamentId}`,
      icon: <IconHome />,
      label: "Torneo",
      active: pathname === `/torneo/${tournamentId}`,
    },
    {
      href: `/torneo/${tournamentId}/mesa`,
      icon: <IconTable />,
      label: "Mi mesa",
      active: pathname === `/torneo/${tournamentId}/mesa`,
    },
    {
      href: `/torneo/${tournamentId}/reglas`,
      icon: <IconBook />,
      label: "Reglas",
      active: pathname === `/torneo/${tournamentId}/reglas`,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex items-center justify-center w-9 h-9 rounded-full text-pp-green-dark hover:bg-pp-green-dark/10 transition-colors"
      >
        <IconMenu />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-pp-brown/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-pp-green-dark flex flex-col gap-1 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-sm text-pp-cream/80 tracking-wide">
                Menú
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="text-pp-cream/70 hover:text-pp-cream w-8 h-8 flex items-center justify-center rounded-full hover:bg-pp-cream/10"
              >
                <IconX />
              </button>
            </div>
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  item.active
                    ? "bg-pp-cream/15 text-pp-cream font-medium"
                    : "text-pp-cream/70 hover:bg-pp-cream/10 hover:text-pp-cream"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
