import { useEffect, useMemo, useRef, useState } from "react";

type DoorType = "math" | "lang";
type Door = { id: number; type: DoorType; x: number; y: number; open: boolean };

type Vec2 = { x: number; y: number };

type MathTask = { kind: "math"; a: number; b: number; op: "+" | "-"; answer: number };
type LangTask = { kind: "lang"; correct: string; wrong: string };
type Task = MathTask | LangTask;

const TILE = 40;
const MAP_W = 20;
const MAP_H = 12;
const BOARD_W = MAP_W * TILE;
const BOARD_H = MAP_H * TILE;

const PLAYER_R = 14;
const WOLF_R = 16;

const PLAYER_SPEED = 160; // px/s
const WOLF_WANDER_SPEED = 120;
const WOLF_CHASE_SPEED = 120; // same speed, only direction changes
const WOLF_CHASE_RADIUS = 180;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

function rectContainsCircle(rx: number, ry: number, rw: number, rh: number, cx: number, cy: number, cr: number) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

function makeInitialDoors(): Door[] {
  // 10 doors: 5 math, 5 lang, scattered around the map
  const placements: Array<Omit<Door, "open">> = [
    { id: 1, type: "math", x: 6 * TILE, y: 2 * TILE },
    { id: 2, type: "lang", x: 12 * TILE, y: 2 * TILE },
    { id: 3, type: "math", x: 16 * TILE, y: 4 * TILE },
    { id: 4, type: "lang", x: 3 * TILE, y: 5 * TILE },
    { id: 5, type: "math", x: 9 * TILE, y: 6 * TILE },
    { id: 6, type: "lang", x: 14 * TILE, y: 7 * TILE },
    { id: 7, type: "math", x: 2 * TILE, y: 9 * TILE },
    { id: 8, type: "lang", x: 7 * TILE, y: 9 * TILE },
    { id: 9, type: "math", x: 12 * TILE, y: 9 * TILE },
    { id: 10, type: "lang", x: 17 * TILE, y: 9 * TILE }
  ];
  return placements.map((d) => ({ ...d, open: false }));
}

function randomMathTask(): MathTask {
  const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
  let a = Math.floor(Math.random() * 101);
  let b = Math.floor(Math.random() * 101);

  if (op === "+") {
    // ensure within 0..100
    a = Math.floor(Math.random() * 101);
    b = Math.floor(Math.random() * (101 - a));
    return { kind: "math", a, b, op, answer: a + b };
  } else {
    // ensure non-negative and within range
    a = Math.floor(Math.random() * 101);
    b = Math.floor(Math.random() * (a + 1));
    return { kind: "math", a, b, op, answer: a - b };
  }
}

const LANG_PAIRS: Array<{ correct: string; wrong: string }> = [
  { correct: "baba", wrong: "dada" },
  { correct: "doba", wrong: "boda" },
  { correct: "dobar", wrong: "bob ar".replace(" ", "") }, // silly, but valid string
  { correct: "brdo", wrong: "drbo" },
  { correct: "bod", wrong: "dod" },
  { correct: "dud", wrong: "bud" },
  { correct: "bubanj", wrong: "dudanj" },
  { correct: "dabar", wrong: "babar" },
  { correct: "brod", wrong: "drod" },
  { correct: "džep", wrong: "bžep" },
  { correct: "badem", wrong: "dadem" },
  { correct: "dobit", wrong: "bobit" },
  { correct: "budi", wrong: "dubi" },
  { correct: "djed", wrong: "bjed" }
];

function randomLangTask(): LangTask {
  const p = LANG_PAIRS[Math.floor(Math.random() * LANG_PAIRS.length)];
  // Randomize order at presentation time; store correct + wrong
  return { kind: "lang", correct: p.correct, wrong: p.wrong };
}

function useNoScroll() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.body.style.overflow = "hidden";
    const opts = { passive: false } as AddEventListenerOptions;

    window.addEventListener("touchmove", prevent, opts);
    window.addEventListener("wheel", prevent, opts);

    const keyPrevent = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", keyPrevent, { passive: false });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("touchmove", prevent as any);
      window.removeEventListener("wheel", prevent as any);
      window.removeEventListener("keydown", keyPrevent as any);
    };
  }, []);
}

function computeScale(containerW: number, containerH: number) {
  const sx = containerW / BOARD_W;
  const sy = containerH / BOARD_H;
  return Math.min(1, sx, sy);
}

function DPad(props: {
  onDirDown: (dir: "up" | "down" | "left" | "right") => void;
  onDirUp: () => void;
}) {
  const makeHandlers = (dir: "up" | "down" | "left" | "right") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      props.onDirDown(dir);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      props.onDirUp();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      props.onDirUp();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  });

  return (
    <div className="dpad" aria-label="Kontrole">
      <button className="dpad-btn up" {...makeHandlers("up")} aria-label="Gore">▲</button>
      <button className="dpad-btn left" {...makeHandlers("left")} aria-label="Lijevo">◀</button>
      <button className="dpad-btn down" {...makeHandlers("down")} aria-label="Dolje">▼</button>
      <button className="dpad-btn right" {...makeHandlers("right")} aria-label="Desno">▶</button>
    </div>
  );
}

function MinecraftSteve() {
  return (
    <div className="steve" aria-hidden="true">
      <div className="head">
        <div className="hair" />
        <div className="face">
          <div className="eye left" />
          <div className="eye right" />
          <div className="mouth" />
        </div>
      </div>
      <div className="body">
        <div className="arm left" />
        <div className="torso" />
        <div className="arm right" />
      </div>
      <div className="legs">
        <div className="leg left" />
        <div className="leg right" />
      </div>
    </div>
  );
}

function Wolf() {
  return (
    <div className="wolf" aria-hidden="true">
      <div className="wolf-head">
        <div className="wolf-ear left" />
        <div className="wolf-ear right" />
        <div className="wolf-snout" />
        <div className="wolf-eye left" />
        <div className="wolf-eye right" />
      </div>
      <div className="wolf-body" />
      <div className="wolf-tail" />
    </div>
  );
}

function Modal(props: {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-title">{props.title}</div>
        <div className="modal-body">{props.children}</div>
        <div className="modal-actions">{props.actions}</div>
      </div>
    </div>
  );
}

export default function App() {
  useNoScroll();

  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const [score, setScore] = useState(0);
  const [doors, setDoors] = useState<Door[]>(() => makeInitialDoors());

  const startPos = useMemo<Vec2>(() => ({ x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }), []);
  const [player, setPlayer] = useState<Vec2>(startPos);
  const [wolf, setWolf] = useState<Vec2>({ x: 15 * TILE + TILE / 2, y: 6 * TILE + TILE / 2 });

  const [gameOver, setGameOver] = useState<null | string>(null);
  const [taskDoorId, setTaskDoorId] = useState<number | null>(null);
  const [task, setTask] = useState<Task | null>(null);

  const [moveDir, setMoveDir] = useState<null | "up" | "down" | "left" | "right">(null);
  const moveDirRef = useRef<typeof moveDir>(null);
  moveDirRef.current = moveDir;

  const wolfTargetRef = useRef<Vec2>({ x: 10 * TILE, y: 6 * TILE });
  const wolfModeRef = useRef<"wander" | "chase">("wander");

  // Lakes and paths are rectangles for quick collision + rendering
  const lakes = useMemo(() => {
    return [
      { x: 5 * TILE, y: 3 * TILE, w: 3 * TILE, h: 2 * TILE },
      { x: 10 * TILE, y: 7 * TILE, w: 3 * TILE, h: 2 * TILE }
    ];
  }, []);

  const trees = useMemo(() => {
    return [
      { x: 1 * TILE, y: 1 * TILE },
      { x: 4 * TILE, y: 1 * TILE },
      { x: 18 * TILE, y: 1 * TILE },
      { x: 17 * TILE, y: 3 * TILE },
      { x: 2 * TILE, y: 7 * TILE },
      { x: 6 * TILE, y: 10 * TILE },
      { x: 14 * TILE, y: 10 * TILE }
    ];
  }, []);

  const paths = useMemo(() => {
    return [
      { x: 0 * TILE, y: 5 * TILE + 14, w: BOARD_W, h: 12 },
      { x: 8 * TILE + 14, y: 0, w: 12, h: BOARD_H }
    ];
  }, []);

  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;

    const onResize = () => {
      const rect = el.getBoundingClientRect();
      setScale(computeScale(rect.width, rect.height));
    };
    onResize();

    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Keyboard movement (desktop)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (gameOver || task) return;
      if (e.key === "ArrowUp") setMoveDir("up");
      if (e.key === "ArrowDown") setMoveDir("down");
      if (e.key === "ArrowLeft") setMoveDir("left");
      if (e.key === "ArrowRight") setMoveDir("right");
    };
    const up = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) setMoveDir(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [gameOver, task]);

  const resetGame = () => {
    setScore(0);
    setDoors(makeInitialDoors());
    setPlayer(startPos);
    setWolf({ x: 15 * TILE + TILE / 2, y: 6 * TILE + TILE / 2 });
    wolfTargetRef.current = { x: 10 * TILE, y: 6 * TILE };
    wolfModeRef.current = "wander";
    setGameOver(null);
    setTask(null);
    setTaskDoorId(null);
    setMoveDir(null);
  };

  const openTaskForDoor = (d: Door) => {
    setTaskDoorId(d.id);
    setTask(d.type === "math" ? randomMathTask() : randomLangTask());
  };

  const markDoorOpen = (doorId: number) => {
    setDoors((prev) => prev.map((d) => (d.id === doorId ? { ...d, open: true } : d)));
  };

  const failTask = () => setScore((s) => s - 10);
  const winTask = () => setScore((s) => s + 10);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (!gameOver && !task) {
        // Player movement
        const dir = moveDirRef.current;
        if (dir) {
          const vel = PLAYER_SPEED * dt;
          let nx = player.x;
          let ny = player.y;
          if (dir === "up") ny -= vel;
          if (dir === "down") ny += vel;
          if (dir === "left") nx -= vel;
          if (dir === "right") nx += vel;

          // keep inside board
          nx = clamp(nx, PLAYER_R, BOARD_W - PLAYER_R);
          ny = clamp(ny, PLAYER_R, BOARD_H - PLAYER_R);

          setPlayer({ x: nx, y: ny });
        }

        // Wolf AI
        const d = dist(player, wolf);
        const wantsChase = d < WOLF_CHASE_RADIUS;
        wolfModeRef.current = wantsChase ? "chase" : "wander";
        const speed = wantsChase ? WOLF_CHASE_SPEED : WOLF_WANDER_SPEED;

        let target = wolfTargetRef.current;

        if (wantsChase) {
          target = player;
        } else {
          // wander: pick a new target if close
          if (dist(wolf, target) < 20) {
            wolfTargetRef.current = {
              x: (1 + Math.random() * (MAP_W - 2)) * TILE,
              y: (1 + Math.random() * (MAP_H - 2)) * TILE
            };
            target = wolfTargetRef.current;
          }
        }

        const vx = target.x - wolf.x;
        const vy = target.y - wolf.y;
        const len = Math.hypot(vx, vy) || 1;
        const step = speed * dt;

        const wx = clamp(wolf.x + (vx / len) * step, WOLF_R, BOARD_W - WOLF_R);
        const wy = clamp(wolf.y + (vy / len) * step, WOLF_R, BOARD_H - WOLF_R);

        setWolf({ x: wx, y: wy });
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.x, player.y, wolf.x, wolf.y, gameOver, task]);

  // Collisions: lake -> game over; wolf contact -> game over; doors -> task
  useEffect(() => {
    if (gameOver) return;

    // Lake
    for (const l of lakes) {
      if (rectContainsCircle(l.x, l.y, l.w, l.h, player.x, player.y, PLAYER_R)) {
        setGameOver("Upao si u jezero. Pljus!");
        return;
      }
    }

    // Wolf contact
    if (dist(player, wolf) < PLAYER_R + WOLF_R - 4) {
      setGameOver("Vuk te pojeo! (Nom nom)");
      return;
    }

    // Door interaction
    if (task) return;
    for (const d of doors) {
      if (d.open) continue;
      if (dist(player, { x: d.x + TILE / 2, y: d.y + TILE / 2 }) < 28) {
        openTaskForDoor(d);
        return;
      }
    }
  }, [doors, gameOver, lakes, player, task, wolf]);

  // Render helpers
  const boardStyle: React.CSSProperties = {
    width: BOARD_W,
    height: BOARD_H,
    transform: `scale(${scale})`,
    transformOrigin: "top left"
  };

  const steveStyle: React.CSSProperties = {
    left: player.x,
    top: player.y
  };

  const wolfStyle: React.CSSProperties = {
    left: wolf.x,
    top: wolf.y
  };

  const doorElements = doors.map((d) => (
    <div
      key={d.id}
      className={`door ${d.type} ${d.open ? "open" : "closed"}`}
      style={{ left: d.x, top: d.y }}
      title={d.open ? "Otvoreno" : d.type === "math" ? "Matematika" : "Jezik"}
    >
      <div className="door-label">{d.open ? "✓" : d.type === "math" ? "∑" : "A"}</div>
    </div>
  ));

  // Task modal state
  const [mathInput, setMathInput] = useState("");
  useEffect(() => setMathInput(""), [task]);

  const taskModal = (() => {
    if (!task || taskDoorId == null) return null;

    if (task.kind === "math") {
      const submit = () => {
        const val = Number(mathInput);
        const ok = Number.isFinite(val) && val === task.answer;
        if (ok) {
          winTask();
          markDoorOpen(taskDoorId);
          setTask(null);
          setTaskDoorId(null);
        } else {
          failTask();
        }
      };

      return (
        <Modal
          title={`Vrata #${taskDoorId} – Matematika`}
          actions={
            <>
              <button className="btn" onClick={submit}>Provjeri</button>
              <button className="btn secondary" onClick={() => { setTask(null); setTaskDoorId(null); }}>Zatvori</button>
            </>
          }
        >
          <div className="task-q">
            Koliko je <b>{task.a}</b> {task.op} <b>{task.b}</b> ?
          </div>
          <input
            className="task-input"
            inputMode="numeric"
            value={mathInput}
            onChange={(e) => setMathInput(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="Upiši rezultat"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoFocus
          />
          <div className="task-hint">Točno +10, netočno -10. Score smije u minus. Život je okrutan.</div>
        </Modal>
      );
    }

    // lang
    const options = Math.random() < 0.5
      ? [task.correct, task.wrong]
      : [task.wrong, task.correct];

    const choose = (word: string) => {
      const ok = word === task.correct;
      if (ok) {
        winTask();
        markDoorOpen(taskDoorId);
        setTask(null);
        setTaskDoorId(null);
      } else {
        failTask();
      }
    };

    return (
      <Modal
        title={`Vrata #${taskDoorId} – Jezik`}
        actions={
          <button className="btn secondary" onClick={() => { setTask(null); setTaskDoorId(null); }}>
            Zatvori
          </button>
        }
      >
        <div className="task-q">Koja je riječ ispravna?</div>
        <div className="task-choices">
          {options.map((w) => (
            <button key={w} className="choice" onClick={() => choose(w)}>{w}</button>
          ))}
        </div>
        <div className="task-hint">Fokus: b / d. Ne daj slovima da te gaslightaju.</div>
      </Modal>
    );
  })();

  const gameOverModal = gameOver ? (
    <Modal
      title="Game Over"
      actions={<button className="btn" onClick={resetGame}>Restart</button>}
    >
      <div className="task-q">{gameOver}</div>
      <div className="task-hint">
        Restart vraća lika na početak, zatvara sva vrata i resetira score. Kao da se ništa nije dogodilo. Osim psihičke štete.
      </div>
    </Modal>
  ) : null;

  return (
    <div className="app">
      <header className="hud">
        <div className="title">Petorka Math</div>
        <div className="score">Score: <b>{score}</b></div>
      </header>

      <div className="game">
        <div className="boardWrap" ref={boardWrapRef}>
          <div className="board" style={boardStyle}>
            <div className="grass" />

            {paths.map((p, idx) => (
              <div key={idx} className="path" style={{ left: p.x, top: p.y, width: p.w, height: p.h }} />
            ))}

            {lakes.map((l, idx) => (
              <div key={idx} className="lake" style={{ left: l.x, top: l.y, width: l.w, height: l.h }} />
            ))}

            {trees.map((t, idx) => (
              <div key={idx} className="tree" style={{ left: t.x, top: t.y }} />
            ))}

            {doorElements}

            <div className="entity steveEntity" style={steveStyle}>
              <MinecraftSteve />
            </div>

            <div className={`entity wolfEntity ${wolfModeRef.current}`} style={wolfStyle}>
              <Wolf />
            </div>
          </div>
        </div>
      </div>

      <div className="controlsOverlay">
        <DPad
          onDirDown={(dir) => {
            if (gameOver || task) return;
            setMoveDir(dir);
          }}
          onDirUp={() => setMoveDir(null)}
        />
      </div>

      {taskModal}
      {gameOverModal}
    </div>
  );
}
