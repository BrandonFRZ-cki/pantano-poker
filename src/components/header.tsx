"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SideMenu } from "@/components/side-menu";

/**
 * Barra superior con el logo, presente en todas las páginas. Cuando la
 * ruta está dentro de un torneo (/torneo/{id}/...) también muestra el
 * botón de menú lateral (cuenta, torneo, mi mesa, reglas).
 */
export function Header() {
  const { firebaseUser } = useAuth();
  const pathname = usePathname() ?? "";
  const tournamentId = pathname.match(/^\/torneo\/([^/]+)/)?.[1];

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center py-3 px-3 border-b border-pp-green-mid/10">
      <span />
      <Link
        href={firebaseUser ? "/panel" : "/"}
        className="flex items-center gap-2 justify-self-center"
      >
        <Image
          src="/icons/logo.svg"
          alt="Pantano Poker"
          width={28}
          height={28}
          unoptimized
        />
        <span className="font-display text-sm text-pp-green-dark tracking-tight">
          PANTANO POKER
        </span>
      </Link>
      <div className="justify-self-end">
        {tournamentId && <SideMenu tournamentId={tournamentId} />}
      </div>
    </header>
  );
}
