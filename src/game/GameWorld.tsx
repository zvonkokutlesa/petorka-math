import { useEffect, useMemo, useRef, useState } from "react";
import MathChallenge from "./MathChallenge";
import LanguageChallenge from "./LanguageChallenge";
import TouchControls from "./TouchControls";

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

const WOLF_W = 34;
const WOLF_H = 22;

const PONDS = [
  { id: 1, x: 70, y: 420, w: 140, h: 90 },
  { id: 2, x: 780, y: 420, w: 160, h: 110 },
];

function isPointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  const playerRef = useRef(player);
  const [wolf, setWolf] = useState({ x: 860, y: 520 });
  const [score, setScore] = useState(0);
  const [activeDoorId, setActiveDoorId] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<"lake" | "wolf">("lake");

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const wolfVel = useRef({ vx: -1.6, vy: -1.2 });
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef<number>(0);

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


  const move = (dx: number, dy: number) => {
    setPlayer((p) => {
      const nx = clamp(p.x + dx, 0, WORLD_W - PLAYER_W);
      const ny = clamp(p.y + dy, 0, WORLD_H - PLAYER_H);
      return { x: nx, y: ny };
    });
  };

  const moveDir = (dir: "up" | "down" | "left" | "right") => {
    const step = 14;
    if (dir === "up") move(0, -step);
    if (dir === "down") move(0, step);
    if (dir === "left") move(-step, 0);
    if (dir === "right") move(step, 0);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeDoorId !== null || gameOver) return;

      const key = e.key.toLowerCase();
      const step = 14;

      moveDir((key === "arrowup" || key === "w") ? "up" : (key === "arrowdown" || key === "s") ? "down" : (key === "arrowleft" || key === "a") ? "left" : "right");
};

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeDoorId, gameOver]);

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

  useEffect(() => {
    if (gameOver) return;

    const cx = player.x + PLAYER_W / 2;
    const cy = player.y + PLAYER_H / 2;

    for (const p of PONDS) {
      if (isPointInRect(cx, cy, p)) {
        setGameOverReason("lake");
        setGameOver(true);
        setActiveDoorId(null);
        break;
      }
    }
  }, [player, gameOver]);

  useEffect(() => {
    if (gameOver) return;

    const loop = (ts: number) => {
      const dt = Math.min(32, ts - lastTick.current);
      lastTick.current = ts;

      setWolf((w) => {
        const px = playerRef.current.x + PLAYER_W / 2;
        const py = playerRef.current.y + PLAYER_H / 2;
        const wx = w.x + WOLF_W / 2;
        const wy = w.y + WOLF_H / 2;

        const dx = px - wx;
        const dy = py - wy;
        const dist = Math.hypot(dx, dy) || 1;

        let vx = wolfVel.current.vx;
        let vy = wolfVel.current.vy;

        if (dist < 260) {
          const speed = 2.4;
          vx = (dx / dist) * speed;
          vy = (dy / dist) * speed;
        }

        wolfVel.current = { vx, vy };

        let nx = w.x + vx * (dt / 16);
        let ny = w.y + vy * (dt / 16);

        if (nx <= 0 || nx >= WORLD_W - WOLF_W) wolfVel.current.vx *= -1;
        if (ny <= 0 || ny >= WORLD_H - WOLF_H) wolfVel.current.vy *= -1;

        return {
          x: clamp(nx, 0, WORLD_W - WOLF_W),
          y: clamp(ny, 0, WORLD_H - WOLF_H),
        };
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;

    const playerRect = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
    const wolfRect = { x: wolf.x, y: wolf.y, w: WOLF_W, h: WOLF_H };

    if (rectsOverlap(playerRect, wolfRect)) {
      setGameOverReason("wolf");
      setGameOver(true);
      setActiveDoorId(null);
    }
  }, [player, wolf, gameOver]);

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
    setWolf({ x: 860, y: 520 });
    wolfVel.current = { vx: -1.6, vy: -1.2 };
    lastTick.current = 0;
    setScore(0);
    setDoorState(doors.map((d) => ({ ...d, open: false })));
    setActiveDoorId(null);
    setGameOver(false);
  };

  return (
    <>
      <div className="score">Score: {score}</div>

      <div className="game">
        <div className="path" style={{ left: 60, top: 140, width: 860, height: 60 }} />
        <div className="path" style={{ left: 120, top: 260, width: 760, height: 60 }} />
        <div className="path" style={{ left: 220, top: 400, width: 560, height: 70 }} />

        {PONDS.map((p) => (
          <div key={p.id} className="pond" style={{ left: p.x, top: p.y, width: p.w, height: p.h }} />
        ))}

        <Tree x={60} y={70} />
        <Tree x={160} y={60} />
        <Tree x={860} y={70} />
        <Tree x={900} y={130} />
        <Tree x={250} y={520} />
        <Tree x={320} y={540} />
        <Tree x={640} y={520} />
        <Tree x={700} y={540} />

        {doorState.map((d) => (
          <div key={d.id} className={`door ${d.open ? "open" : ""}`} style={{ left: d.x, top: d.y }} />
        ))}

        <div className="wolf" style={{ left: wolf.x, top: wolf.y }} />

        <div className="player" style={{ left: player.x, top: player.y }}>
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

      <TouchControls onMoveDelta={move} disabled={gameOver || activeDoorId !== null} />

{gameOver && (
        <div className="modalBackdrop">
          <div className="modal">
            <h2>Game Over</h2>
            {gameOverReason === "wolf" ? "Vuk te pojeo! 🐺" : "Upao si u jezero! 🌊"}
            <div className="row" style={{ marginTop: 12 }}>
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
