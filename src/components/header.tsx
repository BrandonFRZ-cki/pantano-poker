"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

/** Barra superior con el logo, presente en todas las páginas. */
export function Header() {
  const { firebaseUser } = useAuth();

  return (
    <header className="flex items-center justify-center py-3 border-b border-pp-green-mid/10">
      <Link
        href={firebaseUser ? "/panel" : "/"}
        className="flex items-center gap-2"
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
    </header>
  );
}
