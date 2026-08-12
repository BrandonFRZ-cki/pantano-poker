import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-6">
      <Image
        src="/icons/logo.svg"
        alt="Pantano Poker"
        width={160}
        height={160}
        priority
        unoptimized
      />

      <div>
        <h1 className="font-display text-4xl text-pp-green-dark tracking-tight">
          PANTANO
        </h1>
        <h1 className="font-display text-4xl text-pp-brown tracking-tight">
          POKER
        </h1>
      </div>

      <p className="max-w-sm text-pp-brown/80">
        Torneo de poker en familia. Regístrate, sigue el timer de ciegas y
        lleva el control de fichas desde tu celular.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <Link
          href="/login"
          className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors"
        >
          Entrar al torneo
        </Link>
      </div>
    </div>
  );
}
