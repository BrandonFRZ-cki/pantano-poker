"use client";

import Image from "next/image";

/** Pantalla de carga: el logo "respira" en vez de un simple texto. */
export function LoadingScreen() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
      <Image
        src="/icons/logo.svg"
        alt="Pantano Poker"
        width={72}
        height={72}
        unoptimized
        className="animate-pulse"
      />
    </div>
  );
}
