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

- **Crear o unirse a un torneo**: cualquiera puede armar el suyo (fichas, ciegas, buy-in, todo configurable), y quien lo crea queda como dueño. Los demás se suman con un código corto o un QR.
- **Timer de ciegas y niveles**, visible en el celular de cada jugador, controlado por el dealer. El dueño del torneo decide quién es dealer, y puede cambiarlo cuando quiera (dealer fijo o rotativo).
- **Registro de jugadores**: se entra con Google o como invitado, y cada uno elige cómo quiere que se vea su nombre en la mesa.
- **Buy-in, recompras y addon**, con el conteo de fichas de cada jugador siempre al día.
- **Eliminaciones y bounty**: quién eliminó a quién, y quién cobra cada recompensa.
- **Bote total y reparto de premios**, calculado automáticamente según los puestos.
- **Multi-mesa**, para cuando el torneo crece más allá de una sola mesa.

Es una app web (funciona como una PWA: se puede "agregar a inicio" en el
celular como si fuera una app instalada), gratuita de punta a punta —
sin costos de hosting ni de base de datos para el uso de un torneo familiar.

## Estado actual

- ✅ Identidad de marca y estructura del proyecto
- ✅ Login con Google o como invitado, perfil de jugador
- ✅ Crear/unirse a torneos (código y QR), roles owner/dealer/jugador
- 🔜 Panel del dealer (timer, recompras, eliminaciones)
- 🔜 Vista del jugador (timer, stack, mesa)
- 🔜 Bote, bounty y reparto de premios

## Poner el proyecto a andar

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Firebase
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000).

Las credenciales de Firebase y el deploy en Vercel están documentados en el
historial del proyecto; si necesitas repetir esos pasos, pídemelo y te guío
de nuevo.
