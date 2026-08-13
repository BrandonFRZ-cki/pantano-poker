// Piezas de diseño reutilizables de Pantano Poker (tarjetas, botones,
// insignias, avatares). El objetivo es que el timer, las mesas y el resto
// de pantallas que vienen se vean consistentes sin repetir clases sueltas.

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full rounded-2xl bg-white/70 border border-pp-green-mid/15 shadow-sm shadow-pp-green-dark/5 px-5 py-5 ${className}`}
    >
      {children}
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  owner: "bg-pp-brown/10 text-pp-brown",
  dealer: "bg-pp-green-light/30 text-pp-green-dark",
  player: "bg-pp-green-mid/15 text-pp-green-mid",
  neutral: "bg-pp-brown/10 text-pp-brown/70",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_STYLES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-medium ${BADGE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

const BUTTON_STYLES = {
  primary:
    "bg-pp-green-dark text-pp-cream hover:bg-pp-green-mid disabled:opacity-50",
  secondary:
    "border border-pp-green-dark text-pp-green-dark hover:bg-pp-green-light/20 disabled:opacity-50",
  ghost: "text-pp-brown/60 hover:text-pp-brown underline",
  danger:
    "border border-red-700/30 text-red-700 hover:bg-red-50 disabled:opacity-50",
} as const;

type ButtonVariant = keyof typeof BUTTON_STYLES;

const SIZE_STYLES = {
  md: "py-3 px-6 text-base",
  sm: "py-1.5 px-4 text-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_STYLES;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    variant === "ghost"
      ? "font-medium transition-colors"
      : "rounded-full font-display transition-colors";
  return (
    <button
      className={`${base} ${SIZE_STYLES[size]} ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_STYLES;
  className?: string;
  children: ReactNode;
}) {
  const base =
    variant === "ghost"
      ? "font-medium transition-colors"
      : "rounded-full font-display transition-colors text-center";
  return (
    <Link
      href={href}
      className={`${base} ${SIZE_STYLES[size]} ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

const AVATAR_TONES = [
  "bg-pp-green-dark",
  "bg-pp-green-mid",
  "bg-pp-brown",
  "bg-pp-green-light text-pp-green-dark",
];

function toneForName(name: string) {
  const sum = name
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full text-pp-cream font-display text-sm shrink-0 ${toneForName(
        name
      )}`}
    >
      {initial}
    </span>
  );
}

export function IconArrowLeft() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M5 12l7 7M5 12l7-7" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconInfo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function IconChip() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

export function IconClock() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function IconGavel() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m14 13-7.5 7.5a1.5 1.5 0 0 1-2-2L12 11" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6 6 6-6 6z" />
      <path d="M2 22h8" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function IconTable() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <ellipse cx="12" cy="12" rx="5" ry="3" />
    </svg>
  );
}

export function IconBook() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function IconPause() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function IconPlay() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M7 4v16l14-8z" />
    </svg>
  );
}

export function IconUsers() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
