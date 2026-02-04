import { useEffect, useRef } from "react";

type Dir = "up" | "down" | "left" | "right";

export default function TouchControls({
  onMoveDelta,
  disabled,
}: {
  onMoveDelta: (dx: number, dy: number) => void;
  disabled: boolean;
}) {
  const activeDir = useRef<Dir | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  // pixels per second (tuned for kids on phones)
  const SPEED = 220;

  useEffect(() => {
    if (disabled) {
      activeDir.current = null;
      stopLoop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const tick = (ts: number) => {
    if (last.current === null) last.current = ts;
    const dtMs = Math.min(34, ts - last.current); // cap ~30fps jump
    last.current = ts;

    if (!disabled && activeDir.current) {
      const dist = (SPEED * dtMs) / 1000;
      let dx = 0,
        dy = 0;
      if (activeDir.current === "up") dy = -dist;
      if (activeDir.current === "down") dy = dist;
      if (activeDir.current === "left") dx = -dist;
      if (activeDir.current === "right") dx = dist;

      onMoveDelta(dx, dy);
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

  // safety: stop if user lifts finger outside button
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
