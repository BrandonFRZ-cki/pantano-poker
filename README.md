# Pantano Poker

App web (PWA) para gestionar el torneo familiar de poker Pantano Poker: timer
de ciegas, registro de jugadores, recompras/addon, eliminaciones y bounty,
bote y reparto de premios.

Stack: **Next.js (App Router, TypeScript) + Tailwind CSS v4 + Firebase
(Auth + Firestore)**. Hosting gratuito en **Vercel**, código en **GitHub**.

## Estado actual

Fase 1 (scaffold) completa: estructura del proyecto, identidad de marca,
tipos de datos y conexión a Firebase preparada. Las pantallas funcionales
(login, panel del dealer, vista del jugador, timer en tiempo real,
recompras/eliminaciones/bote) se construyen en las próximas fases.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Firebase
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Configurar Firebase (gratis, plan Spark)

1. Andá a [console.firebase.google.com](https://console.firebase.google.com) y creá un proyecto nuevo (ej. `pantano-poker`).
2. En **Authentication > Sign-in method**, habilitá el proveedor **Google**.
3. En **Firestore Database**, creá una base de datos (modo producción, región cercana).
4. En **Configuración del proyecto > Tus apps**, agregá una app web y copiá los valores del SDK.
5. Pegá esos valores en tu archivo `.env.local` (ver `.env.example`).

Las reglas de seguridad de Firestore se agregan en una fase posterior, antes
de abrir la app a los jugadores.

## Deploy en Vercel (gratis)

1. Con el repo ya en GitHub, entrá a [vercel.com/new](https://vercel.com/new) e importá el repositorio.
2. Cargá las mismas variables de `.env.local` en **Settings > Environment Variables** del proyecto en Vercel.
3. Cada push a `main` despliega automáticamente.

## Publicar el repo en GitHub

Este proyecto ya tiene un repo git local inicializado con un primer commit.
Para subirlo:

```bash
# 1. Creá un repo vacío en https://github.com/new (sin README, sin .gitignore)
# 2. Conectalo y subí el código:
git remote add origin https://github.com/<tu-usuario>/pantano-poker.git
git branch -M main
git push -u origin main
```

## Estructura

```
src/
  app/            rutas (App Router)
  lib/firebase.ts  inicialización de Firebase (Auth + Firestore)
  types/tournament.ts  modelo de datos del torneo
public/
  icons/logo.svg  logo de marca
```
