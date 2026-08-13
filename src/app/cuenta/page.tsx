"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Avatar, Badge, Button, Card, IconArrowLeft } from "@/components/ui";
import { LoadingScreen } from "@/components/loading";

function CuentaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTournamentId = searchParams.get("from");
  const { firebaseUser, profile, loading, saveDisplayName, signOutUser } =
    useAuth();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser || !profile) {
    return <LoadingScreen />;
  }

  const name = nameOverride ?? profile.displayName;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveDisplayName(name);
    } catch {
      setError("No se pudo guardar tu nombre. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-6 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <Link
          href={fromTournamentId ? `/torneo/${fromTournamentId}` : "/panel"}
          className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown"
        >
          <IconArrowLeft />
          {fromTournamentId ? "Volver al torneo" : "Mis torneos"}
        </Link>

        <h1 className="font-display text-2xl text-pp-green-dark text-center">
          Tu cuenta
        </h1>

        <Card className="flex flex-col items-center gap-2 text-center">
          <Avatar name={profile.displayName} size={48} />
          <p className="font-display text-pp-brown">{profile.displayName}</p>
          {firebaseUser.isAnonymous ? (
            <Badge tone="neutral">Cuenta de invitado</Badge>
          ) : (
            <p className="text-sm text-pp-brown/60">
              {firebaseUser.email ?? "Sin correo asociado"}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <label className="text-sm text-pp-brown/70">
            Nombre en la mesa
            <input
              value={name}
              onChange={(e) => setNameOverride(e.target.value)}
              maxLength={24}
              className="mt-1 rounded-lg border border-pp-green-mid/40 bg-white px-3 py-2 text-pp-brown outline-none focus:border-pp-green-dark w-full"
            />
          </label>
          <Button
            size="sm"
            disabled={saving || name.trim().length === 0}
            onClick={handleSave}
          >
            {saving ? "Guardando…" : "Guardar nombre"}
          </Button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </Card>

        <Card className="flex flex-col gap-3">
          <Link href="/panel" className="text-sm text-pp-green-dark underline">
            Mis torneos
          </Link>
          <button
            onClick={() => signOutUser()}
            className="text-sm text-red-700/80 hover:text-red-700 underline text-left"
          >
            Cerrar sesión
          </button>
        </Card>
      </div>
    </div>
  );
}

export default function CuentaPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CuentaContent />
    </Suspense>
  );
}
