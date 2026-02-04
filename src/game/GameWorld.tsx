import { useEffect, useState } from "react";
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

export default function GameWorld() {
  const [player, setPlayer] = useState({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [activeDoor, setActiveDoor] = useState<Door | null>(null);

  const [doors, setDoors] = useState<Door[]>([
    { id: 1, x: 100, y: 80, open: false, type: "math" },
    { id: 2, x: 250, y: 80, open: false, type: "language" },
    { id: 3, x: 400, y: 80, open: false, type: "math" },
    { id: 4, x: 100, y: 200, open: false, type: "language" },
    { id: 5, x: 250, y: 200, open: false, type: "math" },
    { id: 6, x: 400, y: 200, open: false, type: "language" },
    { id: 7, x: 150, y: 320, open: false, type: "math" },
    { id: 8, x: 300, y: 320, open: false, type: "language" },
    { id: 9, x: 450, y: 320, open: false, type: "math" },
    { id: 10, x: 550, y: 180, open: false, type: "language" },
  ]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      setPlayer((p) => {
        const step = 10;
        if (e.key === "ArrowUp") return { ...p, y: p.y - step };
        if (e.key === "ArrowDown") return { ...p, y: p.y + step };
        if (e.key === "ArrowLeft") return { ...p, x: p.x - step };
        if (e.key === "ArrowRight") return { ...p, x: p.x + step };
        return p;
      });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    doors.forEach((door) => {
      if (
        !door.open &&
        Math.abs(player.x - door.x) < 20 &&
        Math.abs(player.y - door.y) < 20
      ) {
        setActiveDoor(door);
      }
    });
  }, [player, doors]);

  const handleCorrect = () => {
    setScore((s) => s + 10);
    if (activeDoor) {
      setDoors((ds) =>
        ds.map((d) => (d.id === activeDoor.id ? { ...d, open: true } : d))
      );
    }
    setActiveDoor(null);
  };

  const handleWrong = () => {
    setScore((s) => s - 1);
  };

  return (
    <>
      <div className="score">Score: {score}</div>

      <svg width="100%" height="100vh">
        <rect width="100%" height="100%" fill="#b7e4c7" />
        {doors.map((d) => (
          <rect
            key={d.id}
            x={d.x}
            y={d.y}
            width="20"
            height="30"
            fill={d.open ? "#95d5b2" : "#6c584c"}
          />
        ))}
        <circle cx={player.x} cy={player.y} r="10" fill="blue" />
      </svg>

      {activeDoor && !activeDoor.open && activeDoor.type === "math" && (
        <MathChallenge onCorrect={handleCorrect} onWrong={handleWrong} />
      )}

      {activeDoor && !activeDoor.open && activeDoor.type === "language" && (
        <LanguageChallenge onCorrect={handleCorrect} onWrong={handleWrong} />
      )}
    </>
  );
}