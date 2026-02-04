const pairs = [
  ["beba", "deba"],
  ["deda", "beda"],
  ["dobro", "bobro"],
  ["sloboda", "sloboba"],
  ["deblo", "beblo"],
  ["budala", "dudala"],
  ["bradavica", "dradavica"],
  ["bijelo", "dijelo"],
  ["ljubav", "ljudav"],
];

export default function LanguageChallenge({
  onCorrect,
  onWrong,
}: {
  onCorrect: () => void;
  onWrong: () => void;
}) {
  const [correct, wrong] = pairs[Math.floor(Math.random() * pairs.length)];
  const options = Math.random() > 0.5 ? [correct, wrong] : [wrong, correct];

  const choice = prompt(`Koja je riječ ispravna?\n\n${options[0]} / ${options[1]}`);

  if (choice === correct) onCorrect();
  else onWrong();

  return null;
}