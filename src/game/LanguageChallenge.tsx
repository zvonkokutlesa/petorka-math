import { useMemo, useState } from "react";

const PAIRS: Array<{ correct: string; wrong: string }> = [
  { correct: "beba", wrong: "deba" },
  { correct: "deda", wrong: "beda" },
  { correct: "dobro", wrong: "bobro" },
  { correct: "sloboda", wrong: "sloboba" },
  { correct: "deblo", wrong: "beblo" },
  { correct: "budala", wrong: "dudala" },
  { correct: "bradavica", wrong: "dradavica" },
  { correct: "bijelo", wrong: "dijelo" },
  { correct: "ljubav", wrong: "ljudav" },
];

export default function LanguageChallenge({
  onCorrect,
  onWrong,
  onClose,
}: {
  onCorrect: () => void;
  onWrong: () => void;
  onClose: () => void;
}) {
  const pair = useMemo(() => PAIRS[Math.floor(Math.random() * PAIRS.length)], []);
  const options = useMemo(() => (Math.random() > 0.5 ? [pair.correct, pair.wrong] : [pair.wrong, pair.correct]), [pair]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const choose = (word: string) => {
    if (word === pair.correct) {
      setFeedback("Točno! 🎉");
      setTimeout(() => onCorrect(), 450);
    } else {
      onWrong();
      setFeedback("Nije točno — pokušaj opet!");
    }
  };

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Koja je riječ ispravna?</h2>

        <div className="row" style={{ marginTop: 10 }}>
          {options.map((w) => (
            <button key={w} className="btn" onClick={() => choose(w)}>
              {w}
            </button>
          ))}
          <button className="btn secondary" onClick={onClose}>
            Zatvori
          </button>
        </div>

        {feedback && <div className="feedback">{feedback}</div>}
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
          Pravilo: jedna riječ je stvarna, druga je “lažna” jer miješa slova b i d.
        </div>
      </div>
    </div>
  );
}
