"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const { firebaseUser, profile, loading, signInWithGoogle, signOutUser } =
    useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar con Google. Inténtalo de nuevo.");
      setSigningIn(false);
    }
  };

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
        {!loading && firebaseUser ? (
          <>
            <div className="flex items-center justify-center gap-2 rounded-full bg-white border border-pp-green-mid/20 px-4 py-2">
              <Avatar name={profile?.displayName ?? "Tú"} size={28} />
              <span className="text-sm text-pp-brown truncate">
                Sesión iniciada como{" "}
                <span className="font-medium">
                  {profile?.displayName ?? "tú"}
                </span>
              </span>
            </div>
            <Link
              href="/panel"
              className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors"
            >
              Entrar a un torneo
            </Link>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="text-sm text-pp-brown/50 hover:text-pp-brown underline"
            >
              ¿No eres tú? Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors"
            >
              Entrar a un torneo
            </Link>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="flex items-center justify-center gap-2 rounded-full border border-pp-green-dark/40 bg-white text-pp-brown font-display py-3 px-6 hover:bg-pp-green-light/10 transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
                />
              </svg>
              Registrarme con Google
            </button>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </>
        )}
        <Link
          href="/reglas-pantano-poker"
          className="rounded-full border-2 border-pp-green-dark/40 text-pp-green-dark font-display py-3 px-6 text-center hover:bg-pp-green-light/10 transition-colors mt-1"
        >
          Reglas de torneo Pantano Poker
        </Link>
        <Link
          href="/como-funciona"
          className="rounded-full border-2 border-pp-green-dark/40 text-pp-green-dark font-display py-3 px-6 text-center hover:bg-pp-green-light/10 transition-colors"
        >
          ¿Cómo funciona la web?
        </Link>
      </div>
    </div>
  );
}
