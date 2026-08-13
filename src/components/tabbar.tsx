"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconHome, IconTable, IconUser } from "@/components/ui";
import type { ReactNode } from "react";

function TabLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
        active ? "text-pp-green-dark font-medium" : "text-pp-brown/50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Barra inferior fija con acceso a cuenta, torneo, mesa y reglas. Solo tiene
 * sentido dentro de un torneo, así que pide el tournamentId.
 */
export function TabBar({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      href: `/cuenta?from=${tournamentId}`,
      icon: <IconUser />,
      label: "Cuenta",
      match: (p: string) => p === "/cuenta",
    },
    {
      href: `/torneo/${tournamentId}`,
      icon: <IconHome />,
      label: "Torneo",
      match: (p: string) => p === `/torneo/${tournamentId}`,
    },
    {
      href: `/torneo/${tournamentId}/mesa`,
      icon: <IconTable />,
      label: "Mi mesa",
      match: (p: string) => p === `/torneo/${tournamentId}/mesa`,
    },
    {
      href: `/torneo/${tournamentId}/reglas`,
      icon: <IconBook />,
      label: "Reglas",
      match: (p: string) => p === `/torneo/${tournamentId}/reglas`,
    },
  ];

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-10 mt-4 flex items-stretch justify-around bg-white/90 backdrop-blur border-t border-pp-green-mid/15 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      {tabs.map((tab) => (
        <TabLink
          key={tab.href}
          href={tab.href}
          icon={tab.icon}
          label={tab.label}
          active={tab.match(pathname ?? "")}
        />
      ))}
    </nav>
  );
}
