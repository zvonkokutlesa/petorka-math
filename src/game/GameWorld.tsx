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

const PLAYER_W = 26;
const PLAYER_H = 38;

const PONDS = [
  { id: 1, x: 70, y: 420, w: 140, h: 90 },
  { id: 2, x: 780, y: 420, w: 160, h: 110 },
];

function isPointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

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
  const [gameOver, setGameOver] = useState(false);

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

  const [doorState, setDoorState] = useState<Door[]>(doors);

  useEffect(() => setDoorState(doors), [doors]);

  // Movement (disabled while a modal is open or game over)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeDoorId !== null || gameOver) return;

      const key = e.key.toLowerCase();
      const step = 14;

      setPlayer((p) => {
        let nx = p.x;
        let ny = p.y;

        if (key === "arrowup" || key === "w") ny -= step;
        if (key === "arrowdown" || key === "s") ny += step;
        if (key === "arrowleft" || key === "a") nx -= step;
        if (key === "arrowright" || key === "d") nx += step;

        nx = Math.max(0, Math.min(WORLD_W - PLAYER_W, nx));
        ny = Math.max(0, Math.min(WORLD_H - PLAYER_H, ny));

        return { x: nx, y: ny };
      });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoorId, gameOver]);

  // Door collision (only when not in modal / game over)
  useEffect(() => {
    if (activeDoorId !== null || gameOver) return;

    for (const d of doorState) {
      if (d.open) continue;

      const dx = Math.abs(player.x + PLAYER_W / 2 - (d.x + 14));
      const dy = Math.abs(player.y + PLAYER_H / 2 - (d.y + 21));
      if (dx < 26 && dy < 30) {
        setActiveDoorId(d.id);
        break;
      }
    }
  }, [player, doorState, activeDoorId, gameOver]);

  // Pond collision (lake death)
  useEffect(() => {
    if (gameOver) return;

    const cx = player.x + PLAYER_W / 2;
    const cy = player.y + PLAYER_H / 2;

    for (const p of PONDS) {
      if (isPointInRect(cx, cy, p)) {
        setGameOver(true);
        setActiveDoorId(null);
        break;
      }
    }
  }, [player, gameOver]);

  const activeDoor =
    activeDoorId === null ? null : doorState.find((d) => d.id === activeDoorId) ?? null;

  const onCorrect = () => {
    setScore((s) => s + 10);
    if (activeDoor) {
      setDoorState((ds) => ds.map((d) => (d.id === activeDoor.id ? { ...d, open: true } : d)));
    }
    setActiveDoorId(null);
  };

  const onWrong = () => setScore((s) => s - 1);
  const closeModal = () => setActiveDoorId(null);

  const restart = () => {
    setPlayer({ x: 40, y: 40 });
    setScore(0);
    setDoorState(doors.map((d) => ({ ...d, open: false })));
    setActiveDoorId(null);
    setGameOver(false);
  };

  return (
    <>
      <div className="score">Score: {score}</div>

      <div className="game" role="application" aria-label="Petorka Math World">
        {/* Paths */}
        <div className="path" style={{ left: 60, top: 140, width: 860, height: 60 }} />
        <div className="path" style={{ left: 120, top: 260, width: 760, height: 60 }} />
        <div className="path" style={{ left: 220, top: 400, width: 560, height: 70 }} />

        {/* Ponds (lakes) */}
        {PONDS.map((p) => (
          <div key={p.id} className="pond" style={{ left: p.x, top: p.y, width: p.w, height: p.h }} />
        ))}

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

      {gameOver && (
        <div className="modalBackdrop">
          <div className="modal">
            <h2>Game Over</h2>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Upao si u jezero! 🌊</div>
            <div style={{ opacity: 0.8, marginBottom: 14 }}>Klikni restart i probaj opet.</div>
            <div className="row">
              <button className="btn" onClick={restart}>
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDoor && !activeDoor.open && activeDoor.type === "math" && (
        <MathChallenge onCorrect={onCorrect} onWrong={onWrong} onClose={closeModal} />
      )}

      {activeDoor && !activeDoor.open && activeDoor.type === "language" && (
        <LanguageChallenge onCorrect={onCorrect} onWrong={onWrong} onClose={closeModal} />
      )}
    </>
  );
}
