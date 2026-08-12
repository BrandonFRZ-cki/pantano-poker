"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, PlayerRole } from "@/types/tournament";

// Emails que entran como "admin" (respaldo del dealer) la primera vez que
// inician sesión. Se configura en .env.local, separado por comas.
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  /** true mientras se resuelve el estado inicial de sesión */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Suscripción al documento de perfil del usuario actual. Se recrea cada
    // vez que cambia la sesión, y se cierra la anterior para no dejar
    // listeners de Firestore huérfanos.
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(profileRef);

      if (!snapshot.exists()) {
        const role: PlayerRole = ADMIN_EMAILS.includes(
          (user.email ?? "").toLowerCase()
        )
          ? "admin"
          : "player";

        const newProfile: AppUser = {
          uid: user.uid,
          displayName: user.displayName ?? "Jugador",
          photoURL: user.photoURL ?? undefined,
          role,
          tournamentIds: [],
        };

        await setDoc(profileRef, newProfile);
      }

      // A partir de acá seguimos los cambios en vivo (rol, nombre, torneos
      // en los que participa), sin depender de otra lectura manual.
      unsubscribeProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as AppUser);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const saveDisplayName = async (name: string) => {
    if (!firebaseUser) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    await updateDoc(doc(db, "users", firebaseUser.uid), {
      displayName: trimmed,
    });
    setProfile((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        signInWithGoogle,
        saveDisplayName,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
