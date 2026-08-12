<p align="center">
  <img src="public/icons/logo.svg" alt="Pantano Poker" width="180" />
</p>

<h1 align="center">Pantano Poker</h1>

<p align="center">
  App para organizar el torneo de poker familiar Pantano Poker, pensada para
  usarse desde el celular de cada jugador.
</p>

## ¿Para qué sirve?

Pantano Poker reemplaza el papel, la calculadora y el reloj del celular del
dealer por una sola app que todos en la mesa pueden seguir en tiempo real:

- **Timer de ciegas y niveles**, visible en el celular de cada jugador, controlado por el dealer (con un admin de respaldo por si hace falta).
- **Registro de jugadores**: cada uno entra con su cuenta de Google y elige cómo quiere que se vea su nombre en la mesa.
- **Buy-in, recompras y addon**, con el conteo de fichas de cada jugador siempre al día.
- **Eliminaciones y bounty**: quién eliminó a quién, y quién cobra cada recompensa.
- **Bote total y reparto de premios**, calculado automáticamente según los puestos.
- **Multi-mesa**, para cuando el torneo crece más allá de una sola mesa.

Es una app web (funciona como una PWA: se puede "agregar a inicio" en el
celular como si fuera una app instalada), gratuita de punta a punta —
sin costos de hosting ni de base de datos para el uso de un torneo familiar.

## Estado actual

- ✅ Identidad de marca y estructura del proyecto
- ✅ Login con Google y perfil de jugador
- 🔜 Panel del dealer (timer, recompras, eliminaciones)
- 🔜 Vista del jugador (timer, stack, mesa)
- 🔜 Bote, bounty y reparto de premios

## Poner el proyecto a andar

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Firebase
npm run dev
```

Luego abrí [http://localhost:3000](http://localhost:3000).

Las credenciales de Firebase y el deploy en Vercel están documentados en el
historial del proyecto; si necesitás repetir esos pasos, pedímelo y te guío
de nuevo.
