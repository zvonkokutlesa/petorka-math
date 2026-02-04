import { useMemo, useState } from "react";

function generateMath() {
  let a = 0;
  let b = 0;
  let op: "+" | "-" = "+";
  let result = -1;

  while (result < 0 || result > 100) {
    a = Math.floor(Math.random() * 101);
    b = Math.floor(Math.random() * 101);
    op = Math.random() > 0.5 ? "+" : "-";
    result = op === "+" ? a + b : a - b;
  }

  return { a, b, op, result };
}

export default function MathChallenge({
  onCorrect,
  onWrong,
  onClose,
}: {
  onCorrect: () => void;
  onWrong: () => void;
  onClose: () => void;
}) {
  const q = useMemo(() => generateMath(), []);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = () => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      setFeedback("Upiši broj 🙂");
      return;
    }
    if (num === q.result) {
      setFeedback("Točno! 🎉");
      setTimeout(() => onCorrect(), 450);
    } else {
      onWrong();
      setFeedback("Nije točno — pokušaj opet!");
      setValue("");
    }
  };

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Riješi zadatak</h2>

        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {q.a} {q.op} {q.b} = ?
          </div>
        </div>

        <div className="row">
          <input
            className="input"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Upiši rezultat"
            autoFocus
          />
          <button className="btn" onClick={submit}>
            Provjeri
          </button>
          <button className="btn secondary" onClick={onClose}>
            Zatvori
          </button>
        </div>

        {feedback && <div className="feedback">{feedback}</div>}
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
          Pravila: brojevi i rezultat su uvijek između 0 i 100.
        </div>
      </div>
    </div>
  );
}
