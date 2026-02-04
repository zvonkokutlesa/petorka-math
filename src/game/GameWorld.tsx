import { useEffect, useMemo, useState } from "react";
import MathChallenge from "./MathChallenge";
import LanguageChallenge from "./LanguageChallenge";

type DoorType = "math" | "language";

interface Door {
  id: number;
  x: number;
  y: number;
  open: boolean;
  type: DoorType;
}

const WORLD_W = 980;
const WORLD_H = 640;

function Tree({ x, y }: { x: number; y: number }) {
  return (
    <div className="tree" style={{ left: x, top: y }}>
      <div className="crown" />
      <div className="trunk" />
    </div>
  );
}

export default function GameWorld() {
  const [player, setPlayer] = useState({ x: 40, y: 40 });
  const [score, setScore] = useState(0);
  const [activeDoorId, setActiveDoorId] = useState<number | null>(null);

  const doors = useMemo<Door[]>(
    () => [
      { id: 1, x: 120, y: 90, open: false, type: "math" },
      { id: 2, x: 280, y: 95, open: false, type: "language" },
      { id: 3, x: 460, y: 100, open: false, type: "math" },
      { id: 4, x: 640, y: 110, open: false, type: "language" },
      { id: 5, x: 820, y: 150, open: false, type: "math" },

      { id: 6, x: 140, y: 300, open: false, type: "language" },
      { id: 7, x: 330, y: 300, open: false, type: "math" },
      { id: 8, x: 520, y: 305, open: false, type: "language" },
      { id: 9, x: 730, y: 340, open: false, type: "math" },
      { id: 10, x: 520, y: 500, open: false, type: "language" },
    ],
    []
  );

  const [doorState, setDoorState] = useState(() => doors);

  useEffect(() => setDoorState(doors), [doors]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeDoorId !== null) return;

      const key = e.key.toLowerCase();
      const step = 14;

      setPlayer((p) => {
        let nx = p.x;
        let ny = p.y;

        if (key === "arrowup" || key === "w") ny -= step;
        if (key === "arrowdown" || key === "s") ny += step;
        if (key === "arrowleft" || key === "a") nx -= step;
        if (key === "arrowright" || key === "d") nx += step;

        nx = Math.max(0, Math.min(WORLD_W - 26, nx));
        ny = Math.max(0, Math.min(WORLD_H - 38, ny));

        return { x: nx, y: ny };
      });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoorId]);

  useEffect(() => {
    if (activeDoorId !== null) return;

    for (const d of doorState) {
      if (d.open) continue;

      const dx = Math.abs(player.x + 13 - (d.x + 14));
      const dy = Math.abs(player.y + 19 - (d.y + 21));
      if (dx < 26 && dy < 30) {
        setActiveDoorId(d.id);
        break;
      }
    }
  }, [player, doorState, activeDoorId]);

  const activeDoor =
    activeDoorId === null
      ? null
      : doorState.find((d) => d.id === activeDoorId) ?? null;

  const onCorrect = () => {
    setScore((s) => s + 10);
    if (activeDoor) {
      setDoorState((ds) =>
        ds.map((d) => (d.id === activeDoor.id ? { ...d, open: true } : d))
      );
    }
    setActiveDoorId(null);
  };

  const onWrong = () => setScore((s) => s - 1);
  const closeModal = () => setActiveDoorId(null);

  return (
    <>
      <div className="score">Score: {score}</div>

      <div className="game" role="application" aria-label="Petorka Math World">
        {/* Paths */}
        <div className="path" style={{ left: 60, top: 140, width: 860, height: 60 }} />
        <div className="path" style={{ left: 120, top: 260, width: 760, height: 60 }} />
        <div className="path" style={{ left: 220, top: 400, width: 560, height: 70 }} />

        {/* Ponds */}
        <div className="pond" style={{ left: 70, top: 420, width: 140, height: 90 }} />
        <div className="pond" style={{ left: 780, top: 420, width: 160, height: 110 }} />

        {/* Trees */}
        <Tree x={60} y={70} />
        <Tree x={160} y={60} />
        <Tree x={860} y={70} />
        <Tree x={900} y={130} />
        <Tree x={250} y={520} />
        <Tree x={320} y={540} />
        <Tree x={640} y={520} />
        <Tree x={700} y={540} />
        <Tree x={420} y={30} />
        <Tree x={520} y={30} />

        {/* Doors */}
        {doorState.map((d) => (
          <div
            key={d.id}
            className={`door ${d.open ? "open" : ""}`}
            style={{ left: d.x, top: d.y }}
            title={`Door ${d.id} (${d.type})`}
          />
        ))}

        {/* Player (Minecraft-like) */}
        <div className="player" style={{ left: player.x, top: player.y }} title="Player">
          <div className="head" />
          <div className="hair" />
          <div className="eyes">
            <div className="eye" />
            <div className="eye" />
          </div>
          <div className="body" />
          <div className="legs">
            <div className="leg" />
            <div className="leg" />
          </div>
        </div>
      </div>

      {activeDoor && !activeDoor.open && activeDoor.type === "math" && (
        <MathChallenge onCorrect={onCorrect} onWrong={onWrong} onClose={closeModal} />
      )}

      {activeDoor && !activeDoor.open && activeDoor.type === "language" && (
        <LanguageChallenge onCorrect={onCorrect} onWrong={onWrong} onClose={closeModal} />
      )}
    </>
  );
}
