import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconArrowLeft,
  IconBook,
  IconChip,
  IconClock,
  IconGavel,
  IconInfo,
  IconTable,
  IconUsers,
} from "@/components/ui";
import { SeatDiagram } from "@/components/table-seats";
import type { Player, PokerTable } from "@/types/tournament";
import { formatMoney } from "@/lib/format";
import {
  CHIP_COLOR_HEX,
  CHIP_COLOR_LABEL,
  PANTANO_ADDON_STACK,
  PANTANO_BLIND_STRUCTURE,
  PANTANO_CHIP_VALUES,
  PANTANO_DEFAULTS,
  PANTANO_HOUSE_RULES,
  PANTANO_STARTING_STACK,
} from "@/lib/tournament-defaults";
import { chipsValue } from "@/lib/tournaments";

function ChipDot({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
      style={{ backgroundColor: hex }}
    />
  );
}

const CHIP_COLORS = Object.keys(CHIP_COLOR_LABEL) as (keyof typeof CHIP_COLOR_LABEL)[];
const STARTING_STACK_VALUE = chipsValue(PANTANO_CHIP_VALUES, PANTANO_STARTING_STACK);

// Mesa de ejemplo (no es real, solo ilustra la distribución): 6 jugadores,
// uno con el botón, uno con el turno de hablar y otro ya retirado (fold) de
// esta mano, para mostrar los tres estados de un asiento de una.
const SAMPLE_NAMES = ["Brandon", "Vivi", "Cami", "Andre", "Pau", "Toa"];
const SAMPLE_TABLE: PokerTable = {
  id: "demo",
  tournamentId: "demo",
  name: "Mesa de ejemplo",
  playerIds: SAMPLE_NAMES.map((_, i) => `p${i + 1}`),
  dealerUid: null,
  buttonUid: "p1",
  currentActorUid: "p4",
  speakClockEndsAt: null,
  speakClockPausedMs: null,
  speakClockSeconds: 30,
  foldedUids: ["p6"],
};
const SAMPLE_PLAYERS: Player[] = SAMPLE_NAMES.map((name, i) => ({
  id: `p${i + 1}`,
  tournamentId: "demo",
  uid: `p${i + 1}`,
  displayName: name,
  role: "player",
  tableId: "demo",
  seat: i + 1,
  chips: 5000 - i * 350,
  status: "active",
  bountiesWon: [],
  registeredAt: Date.now(),
}));

interface RuleSection {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  content: ReactNode;
}

const SECTIONS: RuleSection[] = [
  {
    icon: <IconInfo />,
    title: "¿Qué es Pantano Poker?",
    defaultOpen: true,
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Es un torneo de eliminación directa: todos entran con el mismo
          stack de fichas y juegan mano tras mano hasta que uno solo se
          queda con todas. Cada cierto tiempo suben las apuestas mínimas
          (las &quot;ciegas&quot;) para que el torneo no se alargue para
          siempre.
        </p>
        <p>
          Si te quedas en cero fichas, puedes reingresar (recomprar) mientras
          el torneo todavía lo permite, y en el receso hay una única
          oportunidad de comprar fichas extra (addon). Al final se reparte
          un premio en dólares según el puesto en que quedó cada uno, más un
          bounty por cada eliminación que hiciste en el camino.
        </p>
      </div>
    ),
  },
  {
    icon: <IconChip />,
    title: "Cuánto cuesta jugar (valores por defecto)",
    content: (
      <div className="flex flex-col gap-3">
        <p>
          Estos son los montos por defecto de Pantano Poker. El dueño de
          cada torneo los puede cambiar al crearlo, pero así arranca la
          modalidad de base:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            ["Buy-in (inscripción)", PANTANO_DEFAULTS.buyIn],
            ["Recompra", PANTANO_DEFAULTS.rebuyAmount],
            ["Addon", PANTANO_DEFAULTS.addonAmount],
            ["Bounty por eliminación", PANTANO_DEFAULTS.bountyPerElimination],
            ["Multa (regla de la casa)", PANTANO_DEFAULTS.houseRuleFine],
          ].map(([label, amount]) => (
            <div
              key={label as string}
              className="rounded-xl bg-pp-brown/5 px-3 py-2.5 text-center"
            >
              <p className="text-[11px] text-pp-brown/50">{label}</p>
              <p className="font-display text-pp-green-dark">
                {formatMoney(amount as number)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-pp-brown/60">
          El bounty ya viene incluido en cada buy-in/recompra (no es un
          cobro aparte), y la última recompra y la ventana de addon caen
          juntas en el nivel {PANTANO_DEFAULTS.rebuyUntilLevel} (el receso).
          Las mesas son de hasta {PANTANO_DEFAULTS.seatsPerTable} jugadores,
          y los dealers rotan entre mesas cada{" "}
          {PANTANO_DEFAULTS.dealerRotationLevels} niveles.
        </p>
      </div>
    ),
  },
  {
    icon: <IconClock />,
    title: "Ciegas, ante y niveles",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Antes de repartir las cartas, dos jugadores pagan una apuesta
          obligatoria para que siempre haya algo en juego: la{" "}
          <span className="font-medium">ciega chica (SB)</span> y la{" "}
          <span className="font-medium">ciega grande (BB)</span>, que
          normalmente es el doble de la chica. Van rotando de asiento en
          cada mano, junto con el botón.
        </p>
        <p>
          En los niveles más avanzados se suma el{" "}
          <span className="font-medium">ante</span>: a diferencia de las
          ciegas (que solo pagan dos personas), el ante lo paga{" "}
          <span className="font-medium">toda la mesa</span>, para que el
          bote arranque más grande y las manos avancen más rápido.
        </p>
        <p>
          Cada cierto tiempo (un &quot;nivel&quot;) suben la ciega chica, la
          grande y el ante. Eso lo ves arriba de Mi mesa, junto con el
          reloj que marca cuánto falta para que suba el siguiente nivel.
        </p>
        <div>
          <p className="font-medium text-pp-brown mb-1.5">
            Estructura por defecto (15 min. por nivel)
          </p>
          <div className="grid grid-cols-4 gap-1.5 text-xs text-pp-brown/50 px-1">
            <span>Nivel</span>
            <span>Ciegas</span>
            <span>Ante</span>
            <span></span>
          </div>
          <div className="flex flex-col divide-y divide-pp-brown/10">
            {PANTANO_BLIND_STRUCTURE.map((lvl) => (
              <div
                key={lvl.level}
                className="grid grid-cols-4 gap-1.5 items-center py-1 text-sm"
              >
                <span>{lvl.level}</span>
                <span>
                  {lvl.smallBlind}/{lvl.bigBlind}
                </span>
                <span>{lvl.ante}</span>
                <span className="text-[10px] text-pp-brown/40">
                  {lvl.isBreak ? "receso · última recompra/addon" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <IconTable />,
    title: "Cómo se juega una mano (para quien nunca jugó)",
    content: (
      <ol className="list-decimal list-inside flex flex-col gap-1.5">
        <li>Se reparten 2 cartas boca abajo a cada jugador.</li>
        <li>
          Empezando por quien está a la izquierda de la ciega grande, cada
          uno decide: igualar la apuesta, subirla, o retirarse (fold — tirar
          las cartas y salir de esa mano).
        </li>
        <li>
          Se reparten cartas comunitarias en el centro de la mesa (el
          &quot;flop&quot;, el &quot;turn&quot; y el &quot;river&quot;), con
          una nueva ronda de apuestas después de cada una.
        </li>
        <li>
          Gana el bote quien arme la mejor mano de 5 cartas combinando las
          suyas con las del centro — o quien quede solo porque todos los
          demás se retiraron antes de llegar al final.
        </li>
      </ol>
    ),
  },
  {
    icon: <IconChip />,
    title: "El valor de las fichas",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Cada color de ficha representa un monto en dólares — lo define el
          dueño de cada torneo, y lo vas a encontrar siempre en la pestaña{" "}
          <span className="font-medium">Reglas</span> de ese torneo
          específico (junto con cuántas fichas de cada color te tocan al
          empezar y en el addon).
        </p>
        <p>
          Las fichas no valen nada fuera del torneo: son solo para llevar
          la cuenta de cuánto tienes en juego en cada momento. Lo que
          realmente importa al final es tu puesto, no las fichas que
          llegaste a acumular en el camino.
        </p>
        <div>
          <p className="font-medium text-pp-brown mb-1.5">
            Valores por defecto de Pantano Poker
          </p>
          <div className="grid grid-cols-[1.1rem_1fr_1fr_1fr_1fr] gap-2 text-xs text-pp-brown/50 px-1">
            <span></span>
            <span>Color</span>
            <span>Valor</span>
            <span>Stack</span>
            <span>Addon</span>
          </div>
          <div className="flex flex-col divide-y divide-pp-brown/10">
            {CHIP_COLORS.map((color) => (
              <div
                key={color}
                className="grid grid-cols-[1.1rem_1fr_1fr_1fr_1fr] gap-2 items-center py-1"
              >
                <ChipDot hex={CHIP_COLOR_HEX[color]} />
                <span className="text-sm">{CHIP_COLOR_LABEL[color]}</span>
                <span className="text-sm">{PANTANO_CHIP_VALUES[color]}</span>
                <span className="text-sm">{PANTANO_STARTING_STACK[color]}</span>
                <span className="text-sm">{PANTANO_ADDON_STACK[color]}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-pp-brown/50 mt-1.5">
            El stack inicial suma {formatMoney(STARTING_STACK_VALUE)} en
            fichas por los {formatMoney(PANTANO_DEFAULTS.buyIn)} del buy-in.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <IconUsers />,
    title: "Cómo se sientan y quién reparte",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Las mesas se arman y se balancean solas según cuántos jugadores
          hay. Un asiento tiene el &quot;botón&quot;, que marca quién
          reparte esa mano en teoría y rota un asiento en sentido horario
          cada mano — así todos pasan por todas las posiciones (justo
          después del botón van la ciega chica y la ciega grande).
        </p>
        <p>
          El dealer real —quien controla fichas, tiempos y anota todo desde
          el celular— puede ser fijo por mesa o ir rotando cada tantos
          niveles, según cómo se configuró ese torneo. Lo ves marcado
          arriba del diagrama de tu mesa.
        </p>
        <div>
          <SeatDiagram
            table={SAMPLE_TABLE}
            players={SAMPLE_PLAYERS}
            currentUid="p3"
            dealerName="Brandon"
          />
          <p className="text-xs text-pp-brown/50 text-center mt-2">
            Mesa de ejemplo: la &quot;D&quot; marca el botón, el asiento
            resaltado en verde es a quien le toca hablar, y el que aparece
            apagado ya se retiró (fold) en esa mano.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <IconInfo />,
    title: "El all-in y los botes secundarios (side pots)",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Cuando apuestas todas las fichas que te quedan de una vez, estás
          {" "}
          <span className="font-medium">all-in</span>. Si otro jugador
          sigue en la mano con más fichas que tú, no puede apostar contra ti
          más allá de lo que tú pusiste: lo que se sigan apostando entre
          ellos por arriba de tu all-in arma un{" "}
          <span className="font-medium">bote lateral (side pot)</span> del
          que quedas afuera.
        </p>
        <p>
          Solo puedes ganar el bote principal (hasta el límite de tu
          all-in); el bote lateral se lo disputan entre los que siguieron
          con más fichas, aunque tengas la mejor mano de los tres.
        </p>
        <div className="rounded-xl bg-pp-brown/5 px-3 py-2.5 text-sm">
          <p className="font-medium text-pp-brown mb-1">Ejemplo</p>
          <p>
            A tiene 100 fichas y va all-in. B y C tienen 500 cada uno y
            también apuestan esa mano. El bote principal queda en 300 (100
            × 3), que es lo máximo que A puede ganar. Lo que B y C sigan
            apostando entre ellos por arriba de esos 100 arma un bote
            lateral aparte, que solo se reparten entre B y C — A no
            participa de esa parte, gane o pierda.
          </p>
        </div>
        <p className="text-pp-brown/60">
          Si hay varios jugadores en all-in con montos distintos en la
          misma mano, puede armarse más de un bote lateral (uno por cada
          &quot;escalón&quot; de fichas) — el dealer ayuda a armarlos si se
          complica.
        </p>
      </div>
    ),
  },
  {
    icon: <IconChip />,
    title: "Recompras y addon",
    content: (
      <p>
        Si te quedas en cero fichas, puedes recomprar (pagar de nuevo para
        volver con un stack nuevo) mientras el torneo todavía lo permite.
        La última recompra y la ventana de addon —una compra extra de
        fichas, una sola vez, aunque no estés en cero— caen juntas en el
        mismo momento: el nivel marcado como receso. Pasado ese nivel, ya
        no se puede ni recomprar ni hacer addon.
      </p>
    ),
  },
  {
    icon: <IconChip />,
    title: "Bounty y bono de líder de fichas",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Cada vez que eliminas a alguien, además de tu puesto en el
          reparto de premios, ganas un bounty en dólares (ya viene incluido
          en cada inscripción y recompra, no es un cobro aparte). Según el
          torneo, el monto puede ser fijo y visible desde el principio, o
          &quot;misterioso&quot; (se revela recién al cerrarse las
          recompras/addon).
        </p>
        <p>
          Algunos torneos también tienen un bono extra para quien tenga más
          fichas justo en ese momento (el cierre de recompras/addon) — si
          hay empate en la cima, no se lo lleva nadie.
        </p>
      </div>
    ),
  },
  {
    icon: <IconGavel />,
    title: "Multas y reglas de la casa",
    content: (
      <div className="flex flex-col gap-2">
        <p>
          Cada torneo tiene su propia lista de reglas de la casa (la ves en
          la pestaña Reglas de ese torneo). En Pantano Poker, por defecto,
          las 4 reglas cobran lo mismo:{" "}
          <span className="font-medium">
            {formatMoney(PANTANO_DEFAULTS.houseRuleFine)} cada una
          </span>
          .
        </p>
        <ul className="flex flex-col gap-1.5">
          {PANTANO_HOUSE_RULES.map((rule) => (
            <li
              key={rule}
              className="flex items-center justify-between gap-3 rounded-lg bg-pp-brown/5 px-3 py-1.5"
            >
              <span>{rule}</span>
              <span className="text-pp-green-dark font-medium shrink-0">
                {formatMoney(PANTANO_DEFAULTS.houseRuleFine)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    icon: <IconBook />,
    title: "Reparto de premios y la burbuja",
    content: (
      <p>
        Cuántos puestos pagan y qué porcentaje le toca a cada uno sale de
        una tabla estándar según cuántos jugadores entraron en total (no se
        configura a mano). La &quot;burbuja de premios&quot; muestra un
        círculo por puesto que se va llenando recién cuando ese puesto
        queda decidido de verdad —alguien fue eliminado justo ahí—, así que
        mientras un puesto todavía lo puede ocupar cualquiera de los
        jugadores activos, queda vacío.
      </p>
    ),
  },
  {
    icon: <IconClock />,
    title: "Fold, turnos y el reloj para hablar",
    content: (
      <p>
        Para que las manos no se hagan eternas, cada jugador tiene un
        reloj corto para decidir cuando le toca hablar. Si no vas a seguir
        en esa mano, tocas el botón grande de{" "}
        <span className="font-medium">Fold (Retirarse)</span> y esperas a
        la siguiente — vuelves a aparecer normal ahí. El dealer controla el
        orden desde Mi mesa: puede pasar al siguiente jugador o volver al
        anterior si hay alguna confusión.
      </p>
    ),
  },
];

function AccordionSection({ section }: { section: RuleSection }) {
  return (
    <details
      className="group rounded-xl bg-white/70 border border-pp-green-mid/15 open:border-pp-green-dark/30 px-4 py-3.5 transition-colors"
      open={section.defaultOpen}
    >
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pp-green-light/30 text-pp-green-dark shrink-0">
            {section.icon}
          </span>
          <span className="font-display text-sm text-pp-green-dark text-left">
            {section.title}
          </span>
        </span>
        <span className="text-pp-green-dark text-lg shrink-0 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="text-sm text-pp-brown/80 mt-3 pl-[42px] flex flex-col gap-2">
        {section.content}
      </div>
    </details>
  );
}

export default function ReglasPantanoPokerPage() {
  return (
    <div className="flex flex-col flex-1 bg-pp-cream px-5 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
        <Link
          href="/como-funciona"
          className="flex items-center gap-1.5 text-sm text-pp-brown/60 hover:text-pp-brown self-start"
        >
          <IconArrowLeft />
          Cómo funciona la web
        </Link>

        <div className="text-center flex flex-col gap-2">
          <h1 className="font-display text-2xl text-pp-green-dark">
            Reglas de torneo Pantano Poker
          </h1>
          <p className="text-sm text-pp-brown/70 max-w-lg mx-auto">
            Todo lo que necesitas saber para sentarte a jugar, aunque sea tu
            primera vez. Toca cada sección para abrirla.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <AccordionSection key={section.title} section={section} />
          ))}
        </div>

        <p className="text-xs text-pp-brown/40 text-center">
          Cada torneo puede ajustar montos, cantidad de fichas y reglas de
          la casa — eso siempre lo ves en la pestaña{" "}
          <span className="font-medium">Reglas</span> dentro de ESE torneo.
          Esta página es la explicación general de cómo funciona la
          modalidad.
        </p>

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
