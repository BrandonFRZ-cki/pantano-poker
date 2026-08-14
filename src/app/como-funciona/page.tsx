import Link from "next/link";
import {
  Card,
  IconArrowLeft,
  IconBook,
  IconChip,
  IconGavel,
  IconTable,
} from "@/components/ui";

interface GlossaryItem {
  term: string;
  short: string;
  explanation: string;
}

const GLOSSARY: GlossaryItem[] = [
  {
    term: "Ciegas (Blinds)",
    short: "apuestas obligatorias antes de ver las cartas",
    explanation:
      "Para que siempre haya algo en juego, antes de repartir cartas dos jugadores pagan una apuesta obligatoria: la ciega chica (SB) y la ciega grande (BB). Van rotando de asiento en cada mano.",
  },
  {
    term: "SB — Ciega chica (Small Blind)",
    short: "la apuesta obligatoria más chica",
    explanation:
      "La paga quien está sentado justo a la izquierda del botón. Suele ser la mitad de la ciega grande (BB).",
  },
  {
    term: "BB — Ciega grande (Big Blind)",
    short: "la apuesta mínima para seguir en la mano",
    explanation:
      "El doble de la SB, normalmente. La paga la persona siguiente a la de la ciega chica, y marca cuánto tiene que igualar el resto para seguir jugando esa mano.",
  },
  {
    term: "Ante",
    short: "una apuesta chica que pagan todos",
    explanation:
      "A diferencia de las ciegas (que solo pagan dos personas), el ante lo paga cada jugador de la mesa en cada mano. Se usa en los niveles más avanzados para que el bote arranque más grande y el torneo no se alargue tanto.",
  },
  {
    term: "Botón (Dealer button)",
    short: "marca quién reparte esa mano",
    explanation:
      "Es una ficha que rota un asiento cada mano y define el orden en que se apuesta (quién habla primero y quién habla último). No tiene que ver con quién es el dealer real de la mesa en Pantano Poker.",
  },
  {
    term: "Fold (retirarse)",
    short: "tirar tus cartas y salir de esa mano",
    explanation:
      "Cuando no quieres seguir apostando en una mano, te retiras (fold) y esperas a la siguiente. En Mi mesa hay un botón grande para marcarlo cuando es tu turno; vuelves a aparecer normal en la próxima mano.",
  },
  {
    term: "All-in",
    short: "apostar todas las fichas que te quedan",
    explanation:
      "Cuando apuestas absolutamente todo tu stack de una vez. Si pierdes esa mano, quedas eliminado (o pides recompra si todavía se puede).",
  },
  {
    term: "Bounty",
    short: "recompensa extra por eliminar a alguien",
    explanation:
      "Además de tu puesto en el reparto de premios, cada vez que eliminas a otro jugador ganas un monto fijo (o misterioso, según el torneo). Ya viene incluido en cada inscripción/recompra, no es un cobro aparte.",
  },
  {
    term: "Recompra (Rebuy)",
    short: "comprar fichas de nuevo tras quedar en cero",
    explanation:
      "Si te eliminan y el torneo todavía lo permite (hasta cierto nivel), puedes volver a entrar pagando de nuevo el monto de recompra a cambio de un stack nuevo de fichas.",
  },
  {
    term: "Addon",
    short: "una compra extra de fichas, una sola vez",
    explanation:
      "En la ventana del receso puedes comprar fichas adicionales una única vez, aunque no te hayas quedado en cero. Última oportunidad antes de que el torneo siga sin más movimientos de dinero.",
  },
  {
    term: "Bote (Pot)",
    short: "todo lo recaudado para repartir en premios",
    explanation:
      "La suma de todas las inscripciones, recompras y addons, menos el bounty ya pagado por eliminaciones. Eso es lo que se reparte entre los puestos que pagan al final.",
  },
  {
    term: "Burbuja",
    short: "el filo entre cobrar algo o no cobrar nada",
    explanation:
      "Quedar \"en la burbuja\" es estar a un puesto de empezar a ganar premio. En Pantano Poker la sección Premios muestra un círculo por puesto: se llena recién cuando ese puesto ya quedó decidido de verdad.",
  },
  {
    term: "Dealer",
    short: "quien reparte y controla la mesa",
    explanation:
      "Reparte las cartas y controla el orden y los tiempos de la mesa, como en un casino. En Pantano Poker, además, es quien anota fichas, eliminaciones y multas de cada jugador desde su celular.",
  },
  {
    term: "Nivel / Ciega actual",
    short: "cada cierto tiempo suben las apuestas",
    explanation:
      "Cada cierto tiempo (definido al armar el torneo) suben la ciega chica, la grande y el ante, para que el torneo no se alargue para siempre. El reloj de niveles se ve arriba de Mi mesa.",
  },
];

function GlossaryAccordion({ item }: { item: GlossaryItem }) {
  return (
    <details className="group rounded-xl bg-pp-brown/5 open:bg-pp-green-light/15 px-4 py-3 transition-colors">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
        <span className="text-sm text-pp-brown">
          <span className="font-medium">{item.term}</span>
          <span className="text-pp-brown/50"> — {item.short}</span>
        </span>
        <span className="text-pp-green-dark text-lg shrink-0 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="text-sm text-pp-brown/70 mt-2">{item.explanation}</p>
    </details>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown self-start"
        >
          <IconArrowLeft />
          Inicio
        </Link>

        <div className="text-center flex flex-col gap-2">
          <h1 className="font-display text-2xl text-pp-green-dark">
            ¿Cómo funciona Pantano Poker?
          </h1>
          <p className="text-sm text-pp-brown/70 max-w-lg mx-auto">
            Es como sentarte en un torneo de casino, pero llevado desde el
            celular: mismas reglas, mismo vocabulario, solo que las fichas,
            el reloj y los premios los controla la app.
          </p>
        </div>

        <Link
          href="/reglas-pantano-poker"
          className="flex items-center justify-center gap-2 rounded-full bg-pp-green-dark text-pp-cream font-display py-3.5 px-6 text-center hover:bg-pp-green-mid transition-colors"
        >
          <IconGavel />
          Reglas de torneo Pantano Poker
        </Link>
        <p className="text-xs text-pp-brown/50 text-center -mt-5">
          El reglamento completo, explicado desde cero: ciegas, ante,
          all-in, botes secundarios y más.
        </p>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-pp-brown/70 text-center">
            Dentro de un torneo vas a tener 3 secciones
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center text-center gap-2">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-pp-green-light/30 text-pp-green-dark">
                <IconTable />
              </span>
              <p className="font-display text-sm text-pp-green-dark">
                Mi mesa
              </p>
              <p className="text-xs text-pp-brown/60">
                Tu mesa, tus fichas, de quién es el turno y el reloj de
                ciegas — como en un casino, donde el dealer controla el
                orden y los tiempos.
              </p>
            </Card>
            <Card className="flex flex-col items-center text-center gap-2">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-pp-green-light/30 text-pp-green-dark">
                <IconChip />
              </span>
              <p className="font-display text-sm text-pp-green-dark">
                Los premios
              </p>
              <p className="text-xs text-pp-brown/60">
                Cuánto se recaudó y cuánto le toca a cada puesto, con la
                misma tabla de reparto que usan los torneos con garantía.
                Se va llenando en vivo con cada eliminación.
              </p>
            </Card>
            <Card className="flex flex-col items-center text-center gap-2">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-pp-green-light/30 text-pp-green-dark">
                <IconBook />
              </span>
              <p className="font-display text-sm text-pp-green-dark">
                Reglas
              </p>
              <p className="text-xs text-pp-brown/60">
                El reglamento de la casa: estructura de ciegas, multas,
                valor de las fichas y cómo se calculan los premios de ese
                torneo.
              </p>
            </Card>
          </div>
          <p className="text-xs text-pp-brown/50 text-center">
            💡 ¿Cuánto vale cada ficha? Eso lo define el dueño de cada
            torneo — lo vas a encontrar siempre en la pestaña{" "}
            <span className="font-medium">Reglas</span> de ese torneo.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-pp-brown/70 text-center">
            Vocabulario de poker
          </p>
          <p className="text-xs text-pp-brown/50 text-center -mt-1">
            Toca cualquier término para ver la explicación.
          </p>
          <div className="flex flex-col gap-2">
            {GLOSSARY.map((item) => (
              <GlossaryAccordion key={item.term} item={item} />
            ))}
          </div>
        </div>

        <Link
          href="/login"
          className="rounded-full bg-pp-green-dark text-pp-cream font-display py-3 px-6 text-center hover:bg-pp-green-mid transition-colors"
        >
          Entrar a un torneo
        </Link>
      </div>
    </div>
  );
}
