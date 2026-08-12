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
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
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

      try {
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
      } catch (err) {
        // Si esto falla (ej. sin conexión un instante), seguimos: el
        // listener de abajo reintenta la lectura, y saveDisplayName ya usa
        // setDoc con merge, así que puede crear el documento si hiciera falta.
        console.error("No se pudo crear el perfil inicial", err);
      }

      // A partir de acá seguimos los cambios en vivo (nombre, torneos en
      // los que participa), sin depender de otra lectura manual.
      unsubscribeProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as AppUser);
          }
          setLoading(false);
        },
        (err) => {
          console.error("No se pudo escuchar el perfil", err);
          setLoading(false);
        }
      );
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

    // setDoc con merge en vez de updateDoc: si por alguna razón el
    // documento de perfil todavía no se había creado, esto lo crea en vez
    // de fallar con "no existe".
    await setDoc(
      doc(db, "users", firebaseUser.uid),
      {
        uid: firebaseUser.uid,
        displayName: trimmed,
        tournamentIds: profile?.tournamentIds ?? [],
      },
      { merge: true }
    );
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
