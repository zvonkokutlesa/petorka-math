export default function MathChallenge({
  onCorrect,
  onWrong,
}: {
  onCorrect: () => void;
  onWrong: () => void;
}) {
  let a = 0,
    b = 0,
    result = -1,
    op = "+";

  while (result < 0 || result > 100) {
    a = Math.floor(Math.random() * 101);
    b = Math.floor(Math.random() * 101);
    op = Math.random() > 0.5 ? "+" : "-";
    result = op === "+" ? a + b : a - b;
  }

  const answer = prompt(`${a} ${op} ${b} = ?`);

  if (answer !== null && Number(answer) === result) onCorrect();
  else onWrong();

  return null;
}