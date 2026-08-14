"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "@/components/loading";

export default function LoginPage() {
  const router = useRouter();
  const {
    firebaseUser,
    profile,
    loading,
    signInWithGoogle,
    signInAsGuest,
    saveDisplayName,
  } = useAuth();

  // null = el usuario todavía no tocó el campo, mostramos el nombre de su
  // perfil (o el de Google) como valor por defecto sin usar un efecto.
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = nameOverride ?? profile?.displayName ?? "";

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    try {
      await signInAsGuest();
    } catch {
      setError("No se pudo entrar como invitado. Inténtalo de nuevo.");
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveDisplayName(name);
      router.push("/panel");
    } catch {
      setError("No se pudo guardar tu nombre. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  // Todavía no inició sesión: solo el botón de Google.
  if (!firebaseUser) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-6">
        <h1 className="font-display text-2xl text-pp-green-dark">
          Ingreso al torneo
        </h1>
        <p className="max-w-sm text-pp-brown/80">
          Ingresa con tu cuenta de Google. Después vas a poder elegir cómo
          quieres que se vea tu nombre en la mesa.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleGoogleSignIn}
            className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors"
          >
            Entrar con Google
          </button>
          <button
            onClick={handleGuestSignIn}
            className="rounded-full border border-pp-brown/30 text-pp-brown/70 font-display py-3 px-6 hover:bg-pp-brown/5 transition-colors"
          >
            Entrar como invitado
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  // Ya inició sesión: confirmar/editar el nombre antes de entrar.
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-pp-cream px-6 py-16 text-center gap-6">
      <h1 className="font-display text-2xl text-pp-green-dark">
        ¿Cómo te llamamos en la mesa?
      </h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          value={name}
          onChange={(e) => setNameOverride(e.target.value)}
          placeholder="Tu nombre"
          maxLength={24}
          className="rounded-full border border-pp-green-mid/40 bg-white px-5 py-3 text-center text-pp-brown outline-none focus:border-pp-green-dark"
        />
        <button
          onClick={handleContinue}
          disabled={saving || name.trim().length === 0}
          className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 hover:bg-pp-green-mid transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Continuar"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
