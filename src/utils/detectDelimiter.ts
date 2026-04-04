export function detectDelimiter(text: string): "," | "\t" | ";" {
  const sample = text.split("\n").slice(0, 10).join("\n");
  const counts = {
    ",": (sample.match(/,/g) ?? []).length,
    "\t": (sample.match(/\t/g) ?? []).length,
    ";": (sample.match(/;/g) ?? []).length,
  };
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0] as
    | ","
    | "\t"
    | ";";
}
