import { useEffect, useRef } from "react";

type Dir = "up" | "down" | "left" | "right";

export default function TouchControls({
  onMove,
  disabled,
}: {
  onMove: (dir: Dir) => void;
  disabled: boolean;
}) {
  const activeDir = useRef<Dir | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) {
      activeDir.current = null;
    }
  }, [disabled]);

  const tick = (ts: number) => {
    if (last.current === null) last.current = ts;
    const dt = Math.min(40, ts - last.current);
    last.current = ts;

    if (!disabled && activeDir.current) {
      // Move at ~60fps, scale so holding feels consistent
      // (we call onMove multiple times per second)
      const repeats = Math.max(1, Math.round(dt / 16));
      for (let i = 0; i < repeats; i++) onMove(activeDir.current);
    }
    raf.current = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    last.current = null;
  };

  const press = (dir: Dir) => {
    if (disabled) return;
    activeDir.current = dir;
    startLoop();
  };

  const release = () => {
    activeDir.current = null;
    stopLoop();
  };

  // One-time safety: stop loop if user lifts finger outside button
  useEffect(() => {
    const onUp = () => release();
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className={`touchControls ${disabled ? "disabled" : ""}`} aria-label="Touch controls">
      <div className="dpad">
        <button
          className="pad up"
          onTouchStart={(e) => {
            e.preventDefault();
            press("up");
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            release();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            press("up");
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            release();
          }}
        >
          ▲
        </button>

        <button
          className="pad left"
          onTouchStart={(e) => {
            e.preventDefault();
            press("left");
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            release();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            press("left");
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            release();
          }}
        >
          ◀
        </button>

        <button
          className="pad down"
          onTouchStart={(e) => {
            e.preventDefault();
            press("down");
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            release();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            press("down");
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            release();
          }}
        >
          ▼
        </button>

        <button
          className="pad right"
          onTouchStart={(e) => {
            e.preventDefault();
            press("right");
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            release();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            press("right");
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            release();
          }}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
