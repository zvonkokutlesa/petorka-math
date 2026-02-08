import { useEffect, useMemo, useRef, useState } from "react";

type DoorType = "math" | "lang";
type Door = { id: number; type: DoorType; x: number; y: number; open: boolean };

type Vec2 = { x: number; y: number };

type MathTask = { kind: "math"; a: number; b: number; op: "+" | "-"; answer: number };
type LangTask = { kind: "lang"; correct: string; wrong: string };
type Task = MathTask | LangTask;
type GameOverState = { message: string; outcome: "defeat" | "victory" };

const TILE = 40;
const MAP_W = 20;
const MAP_H = 12;
const BOARD_W = MAP_W * TILE;
const BOARD_H = MAP_H * TILE;

const PLAYER_R = 14;
const WOLF_R = 16;

const PLAYER_SPEED = 160; // px/s
const WOLF_WANDER_SPEED = 80;
const WOLF_CHASE_SPEED = 80; // same speed, only direction changes
const WOLF_CHASE_RADIUS = 150;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const clampTo = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function rectContainsCircle(rx: number, ry: number, rw: number, rh: number, cx: number, cy: number, cr: number) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

function pickWolfWanderTarget(lakes: Array<{ x: number; y: number; w: number; h: number }>) {
  for (let i = 0; i < 20; i += 1) {
    const candidate = {
      x: (1 + Math.random() * (MAP_W - 2)) * TILE,
      y: (1 + Math.random() * (MAP_H - 2)) * TILE
    };
    const inLake = lakes.some((l) => rectContainsCircle(l.x, l.y, l.w, l.h, candidate.x, candidate.y, WOLF_R));
    if (!inLake) return candidate;
  }
  return { x: 2 * TILE, y: 2 * TILE };
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
  { correct: "dobar", wrong: "bodar" },  
  { correct: "brdo", wrong: "drbo" },
  { correct: "bod", wrong: "dod" },
  { correct: "duda", wrong: "buda" },
  { correct: "bubanj", wrong: "dudanj" },
  { correct: "dabar", wrong: "babar" },
  { correct: "brod", wrong: "drod" },
  { correct: "džep", wrong: "bžep" },
  { correct: "badem", wrong: "dabem" },
  { correct: "dobit", wrong: "bobit" },
  { correct: "budi", wrong: "dubi" },
  { correct: "djed", wrong: "bjed" },
  { correct: "barka", wrong: "darka" },
  { correct: "daska", wrong: "baska" },
  { correct: "bedak", wrong: "dedak" },
  { correct: "dobar", wrong: "dobad" },
  { correct: "bidon", wrong: "didon" },
  { correct: "dubok", wrong: "bubok" },
  { correct: "biser", wrong: "diser" },
  { correct: "dolina", wrong: "bolina" },
  { correct: "brada", wrong: "draba" },
  { correct: "bedem", wrong: "dedem" },
  { correct: "budala", wrong: "dudala" },
  { correct: "dobro", wrong: "bobro" },
  { correct: "bodež", wrong: "dodež" },
  { correct: "dabar", wrong: "dadar" },
  { correct: "buket", wrong: "duket" },
  { correct: "dobitak", wrong: "bobitak" },
  { correct: "bubreg", wrong: "dubreg" },
  { correct: "dnevnik", wrong: "bnevnik" },
  { correct: "barjak", wrong: "darjak" },
  { correct: "dobaciti", wrong: "bobaciti" }
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

function updateFavicon(state: { player: Vec2; wolf: Vec2; task: Task | null; gameOver: GameOverState | null }) {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = state.gameOver ? "#3d1212" : "#1e5a33";
  ctx.fillRect(0, 0, size, size);

  if (state.task) {
    ctx.strokeStyle = "#f5d142";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }

  const pad = 4;
  const mapX = (x: number) => clampTo((x / BOARD_W) * (size - pad * 2) + pad, pad, size - pad);
  const mapY = (y: number) => clampTo((y / BOARD_H) * (size - pad * 2) + pad, pad, size - pad);

  ctx.fillStyle = "#59d7ff";
  ctx.beginPath();
  ctx.arc(mapX(state.player.x), mapY(state.player.y), 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f06b64";
  ctx.beginPath();
  ctx.arc(mapX(state.wolf.x), mapY(state.wolf.y), 4, 0, Math.PI * 2);
  ctx.fill();

  if (state.gameOver) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(size - 6, size - 6);
    ctx.moveTo(size - 6, 6);
    ctx.lineTo(6, size - 6);
    ctx.stroke();
  }

  const linkId = "favicon";
  let link = document.querySelector<HTMLLinkElement>(`link#${linkId}[rel="icon"]`);
  if (!link) {
    link = document.createElement("link");
    link.id = linkId;
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL("image/png");
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
  const [boardScale, setBoardScale] = useState(1);

  const [score, setScore] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [doors, setDoors] = useState<Door[]>(() => makeInitialDoors());

  const startPos = useMemo<Vec2>(() => ({ x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }), []);
  const [player, setPlayer] = useState<Vec2>(startPos);
  const [wolf, setWolf] = useState<Vec2>({ x: 15 * TILE + TILE / 2, y: 6 * TILE + TILE / 2 });

  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
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
      if (rect.width <= 0 || rect.height <= 0) return;
      const nextScale = Math.min(1, rect.width / BOARD_W, rect.height / BOARD_H);
      setBoardScale(nextScale > 0 ? nextScale : 1);
    };
    onResize();

    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(el);
    }

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
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
    setDoors((prev) => {
      const next = prev.map((d) => (d.id === doorId ? { ...d, open: true } : d));
      const allOpen = next.every((d) => d.open);
      if (allOpen) {
        setGameOver({ message: "Bravo! Sva vrata su otvorena.", outcome: "victory" });
      }
      return next;
    });
  };

  const playSuccessSound = () => {
    const ctx = ensureAudioContext();
    void ctx.resume();
    playToneSequence(ctx, [
      { freq: 523.25, duration: 0.12 },
      { freq: 659.25, duration: 0.12 },
      { freq: 783.99, duration: 0.18 }
    ]);
  };

  const playFailSound = () => {
    const ctx = ensureAudioContext();
    void ctx.resume();
    playToneSequence(ctx, [
      { freq: 220, duration: 0.15 },
      { freq: 196, duration: 0.18 },
      { freq: 164.81, duration: 0.2 }
    ], { type: "sawtooth", gain: 0.06 });
  };

  const playVictorySound = () => {
    const ctx = ensureAudioContext();
    void ctx.resume();
    playToneSequence(ctx, [
      { freq: 392, duration: 0.15 },
      { freq: 523.25, duration: 0.15 },
      { freq: 659.25, duration: 0.2 },
      { freq: 784, duration: 0.3 }
    ], { type: "triangle", gain: 0.08 });
  };

  const playDefeatSound = () => {
    const ctx = ensureAudioContext();
    void ctx.resume();
    playToneSequence(ctx, [
      { freq: 220, duration: 0.2 },
      { freq: 196, duration: 0.2 },
      { freq: 174.61, duration: 0.25 },
      { freq: 146.83, duration: 0.3 }
    ], { type: "square", gain: 0.08 });
  };

  const failTask = () => {
    setScore((s) => s - 10);
    playFailSound();
  };

  const winTask = () => {
    setScore((s) => s + 10);
    playSuccessSound();
  };

  const audioStateRef = useRef<{
    ctx: AudioContext | null;
    musicOscA: OscillatorNode | null;
    musicOscB: OscillatorNode | null;
    musicLfo: OscillatorNode | null;
    musicLfoGain: GainNode | null;
    musicGain: GainNode | null;
    musicInterval: number | null;
  }>({
    ctx: null,
    musicOscA: null,
    musicOscB: null,
    musicLfo: null,
    musicLfoGain: null,
    musicGain: null,
    musicInterval: null
  });

  const ensureAudioContext = () => {
    if (!audioStateRef.current.ctx) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser.");
      }
      audioStateRef.current.ctx = new AudioContextCtor();
    }
    return audioStateRef.current.ctx;
  };

  const startBackgroundMusic = () => {
    const ctx = ensureAudioContext();
    if (audioStateRef.current.musicOscA || audioStateRef.current.musicOscB) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.02;
    gain.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = 220;
    oscA.connect(gain);
    oscA.start();

    const oscB = ctx.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 330;
    oscB.connect(gain);
    oscB.start();

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.006;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    audioStateRef.current.musicOscA = oscA;
    audioStateRef.current.musicOscB = oscB;
    audioStateRef.current.musicLfo = lfo;
    audioStateRef.current.musicLfoGain = lfoGain;
    audioStateRef.current.musicGain = gain;

    const notes = [220, 247, 262, 294, 330, 294, 262, 247];
    let idx = 0;
    audioStateRef.current.musicInterval = window.setInterval(() => {
      const n = notes[idx % notes.length];
      oscA.frequency.setTargetAtTime(n, ctx.currentTime, 0.25);
      oscB.frequency.setTargetAtTime(n * 1.5, ctx.currentTime, 0.25);
      idx += 1;
    }, 900);
  };

  const stopBackgroundMusic = () => {
    const { musicOscA, musicOscB, musicLfo, musicLfoGain, musicGain, musicInterval } = audioStateRef.current;
    if (musicInterval) window.clearInterval(musicInterval);
    if (musicOscA) {
      musicOscA.stop();
      musicOscA.disconnect();
    }
    if (musicOscB) {
      musicOscB.stop();
      musicOscB.disconnect();
    }
    if (musicLfo) {
      musicLfo.stop();
      musicLfo.disconnect();
    }
    if (musicLfoGain) musicLfoGain.disconnect();
    if (musicGain) musicGain.disconnect();
    audioStateRef.current.musicOscA = null;
    audioStateRef.current.musicOscB = null;
    audioStateRef.current.musicLfo = null;
    audioStateRef.current.musicLfoGain = null;
    audioStateRef.current.musicGain = null;
    audioStateRef.current.musicInterval = null;
  };

  const playToneSequence = (
    ctx: AudioContext,
    notes: Array<{ freq: number; duration: number }>,
    options: { type?: OscillatorType; gain?: number } = {}
  ) => {
    const gain = ctx.createGain();
    gain.gain.value = options.gain ?? 0.07;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = options.type ?? "sine";
    osc.connect(gain);
    let t = ctx.currentTime;
    for (const note of notes) {
      osc.frequency.setValueAtTime(note.freq, t);
      gain.gain.setValueAtTime(options.gain ?? 0.07, t);
      t += note.duration;
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, t);
    osc.start();
    osc.stop(t + 0.05);
  };

  useEffect(() => {
    if (!musicEnabled) {
      stopBackgroundMusic();
      return;
    }

    const handleStart = () => {
      const ctx = ensureAudioContext();
      void ctx.resume();
      startBackgroundMusic();
    };
    window.addEventListener("pointerdown", handleStart, { once: true });
    window.addEventListener("keydown", handleStart, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleStart);
      window.removeEventListener("keydown", handleStart);
      stopBackgroundMusic();
    };
  }, [musicEnabled]);

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
            wolfTargetRef.current = pickWolfWanderTarget(lakes);
            target = wolfTargetRef.current;
          }
        }

        const vx = target.x - wolf.x;
        const vy = target.y - wolf.y;
        const len = Math.hypot(vx, vy) || 1;
        const step = speed * dt;

        const proposed = {
          x: clamp(wolf.x + (vx / len) * step, WOLF_R, BOARD_W - WOLF_R),
          y: clamp(wolf.y + (vy / len) * step, WOLF_R, BOARD_H - WOLF_R)
        };
        const hitsLake = lakes.some((l) => rectContainsCircle(l.x, l.y, l.w, l.h, proposed.x, proposed.y, WOLF_R));
        if (!hitsLake) {
          setWolf(proposed);
        } else {
          const slideX = { x: proposed.x, y: wolf.y };
          const slideY = { x: wolf.x, y: proposed.y };
          const hitX = lakes.some((l) => rectContainsCircle(l.x, l.y, l.w, l.h, slideX.x, slideX.y, WOLF_R));
          const hitY = lakes.some((l) => rectContainsCircle(l.x, l.y, l.w, l.h, slideY.x, slideY.y, WOLF_R));
          if (!hitX) {
            setWolf(slideX);
          } else if (!hitY) {
            setWolf(slideY);
          } else {
            if (!wantsChase) {
              wolfTargetRef.current = pickWolfWanderTarget(lakes);
            }
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.x, player.y, wolf.x, wolf.y, gameOver, task]);

  useEffect(() => {
    updateFavicon({ player, wolf, task, gameOver });
  }, [player, wolf, task, gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    if (gameOver.outcome === "victory") {
      playVictorySound();
    } else {
      playDefeatSound();
    }
  }, [gameOver]);

  // Collisions: lake -> game over; wolf contact -> game over; doors -> task
  useEffect(() => {
    if (gameOver) return;

    // Lake
    for (const l of lakes) {
      if (rectContainsCircle(l.x, l.y, l.w, l.h, player.x, player.y, PLAYER_R)) {
        setGameOver({ message: "Upao si u jezero. Pljus!", outcome: "defeat" });
        return;
      }
    }

    // Wolf contact
    if (dist(player, wolf) < PLAYER_R + WOLF_R - 4) {
      setGameOver({ message: "Vuk te pojeo! (Nom nom)", outcome: "defeat" });
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
  const boardFrameStyle: React.CSSProperties = {
    width: BOARD_W * boardScale,
    height: BOARD_H * boardScale
  };

  const boardStyle: React.CSSProperties = {
    width: BOARD_W,
    height: BOARD_H,
    transform: `scale(${boardScale})`,
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
      <div className="task-q">{gameOver.message}</div>
      <div className="task-hint">
        Restart vraća lika na početak, zatvara sva vrata i resetira score. Kao da se ništa nije dogodilo. Osim psihičke štete.
      </div>
    </Modal>
  ) : null;

  return (
    <div className="app">
      <header className="hud">
        <div className="title">Petorka Math</div>
        <div className="hudRight">
          <button
            className="musicToggle"
            onClick={() => setMusicEnabled((v) => !v)}
            aria-pressed={musicEnabled}
            title="Uključi ili isključi pozadinsku muziku"
          >
            {musicEnabled ? "Music: On" : "Music: Off"}
          </button>
          <div className="score">Score: <b>{score}</b></div>
        </div>
      </header>

      <div className="game">
        <div className="boardWrap" ref={boardWrapRef}>
          <div className="boardFrame" style={boardFrameStyle}>
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
