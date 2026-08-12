"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin (respaldo del dealer)",
  dealer: "Dealer",
  player: "Jugador",
};

export default function PanelPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading, signOutUser } = useAuth();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser || !profile) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16">
        <p className="text-pp-brown/70">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-4">
      <h1 className="font-display text-2xl text-pp-green-dark">
        Hola, {profile.displayName}
      </h1>
      <span className="rounded-full bg-pp-green-light/30 px-4 py-1 text-sm text-pp-green-dark">
        {ROLE_LABEL[profile.role] ?? profile.role}
      </span>
      <p className="max-w-sm text-pp-brown/80">
        Acá va a vivir el timer, tu stack y el resto del torneo. Esta
        pantalla se construye en la próxima fase.
      </p>
      <button
        onClick={() => signOutUser()}
        className="mt-4 text-sm text-pp-brown/60 underline"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
