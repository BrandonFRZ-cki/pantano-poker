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
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types/tournament";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: AppUser | null;
  /** true mientras se resuelve el estado inicial de sesión */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
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
        const newProfile: AppUser = {
          uid: user.uid,
          displayName: user.displayName ?? "Invitado",
          photoURL: user.photoURL ?? undefined,
          tournamentIds: [],
        };

        await setDoc(profileRef, newProfile);
      }

      // A partir de acá seguimos los cambios en vivo (nombre, torneos en
      // los que participa), sin depender de otra lectura manual.
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

  // Sesión anónima de Firebase: útil para probar la app o para quien no
  // quiere entrar con Google. El nombre se elige en el paso siguiente, igual
  // que con Google.
  const signInAsGuest = async () => {
    await signInAnonymously(auth);
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
        signInAsGuest,
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
