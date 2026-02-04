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

const WORLD_W = 900;
const WORLD_H = 600;

export default function GameWorld() {
  const [player, setPlayer] = useState({ x: 40, y: 40 });
  const [score, setScore] = useState(0);
  const [activeDoorId, setActiveDoorId] = useState<number | null>(null);

  const doors = useMemo<Door[]>(() => {
    // Exactly 10 doors: 5 math, 5 language
    return [
      { id: 1, x: 100, y: 80, open: false, type: "math" },
      { id: 2, x: 250, y: 80, open: false, type: "language" },
      { id: 3, x: 400, y: 80, open: false, type: "math" },
      { id: 4, x: 560, y: 80, open: false, type: "language" },
      { id: 5, x: 700, y: 120, open: false, type: "math" },

      { id: 6, x: 120, y: 260, open: false, type: "language" },
      { id: 7, x: 300, y: 260, open: false, type: "math" },
      { id: 8, x: 480, y: 260, open: false, type: "language" },
      { id: 9, x: 660, y: 300, open: false, type: "math" },
      { id: 10, x: 420, y: 420, open: false, type: "language" },
    ];
  }, []);

  const [doorState, setDoorState] = useState(() => doors);

  useEffect(() => {
    setDoorState(doors);
  }, [doors]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeDoorId !== null) return; // freeze movement while modal open

      const key = e.key.toLowerCase();
      const step = 14;

      setPlayer((p) => {
        let nx = p.x;
        let ny = p.y;

        if (key === "arrowup" || key === "w") ny -= step;
        if (key === "arrowdown" || key === "s") ny += step;
        if (key === "arrowleft" || key === "a") nx -= step;
        if (key === "arrowright" || key === "d") nx += step;

        // clamp to world bounds
        nx = Math.max(0, Math.min(WORLD_W - 22, nx));
        ny = Math.max(0, Math.min(WORLD_H - 22, ny));

        return { x: nx, y: ny };
      });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoorId]);

  // collision detection
  useEffect(() => {
    if (activeDoorId !== null) return;

    for (const d of doorState) {
      if (d.open) continue;

      const dx = Math.abs(player.x + 11 - (d.x + 13));
      const dy = Math.abs(player.y + 11 - (d.y + 19));
      if (dx < 24 && dy < 28) {
        setActiveDoorId(d.id);
        break;
      }
    }
  }, [player, doorState, activeDoorId]);

  const activeDoor = activeDoorId === null ? null : doorState.find((d) => d.id === activeDoorId) ?? null;

  const onCorrect = () => {
    setScore((s) => s + 10);
    if (activeDoor) {
      setDoorState((ds) => ds.map((d) => (d.id === activeDoor.id ? { ...d, open: true } : d)));
    }
    setActiveDoorId(null);
  };

  const onWrong = () => {
    setScore((s) => s - 1);
  };

  const closeModal = () => setActiveDoorId(null);

  return (
    <>
      <div className="score">Score: {score}</div>

      <div className="game" role="application" aria-label="Petorka Math Game World">
        {doorState.map((d) => (
          <div
            key={d.id}
            className={`door ${d.open ? "open" : ""}`}
            style={{ left: d.x, top: d.y }}
            title={`Door ${d.id} (${d.type})`}
          />
        ))}

        <div className="player" style={{ left: player.x, top: player.y }} title="Player" />
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
