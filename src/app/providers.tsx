"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/header";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Header />
      {children}
    </AuthProvider>
  );
}
