export interface CharInfo {
  name: string;
  abbr: string;
  cat: "control" | "format" | "space" | "bidi" | "separator";
}

export type CharType =
  | "visible"
  | "space"
  | "tab"
  | "newline"
  | "cr"
  | "invisible";

export const CHAR_DB: Record<number, CharInfo> = {
  0x00a0: { name: "No-Break Space", abbr: "NBSP", cat: "space" },
  0x00ad: { name: "Soft Hyphen", abbr: "SHY", cat: "format" },
  0x200b: { name: "Zero Width Space", abbr: "ZWSP", cat: "format" },
  0x200c: { name: "ZW Non-Joiner", abbr: "ZWNJ", cat: "format" },
  0x200d: { name: "ZW Joiner", abbr: "ZWJ", cat: "format" },
  0x200e: { name: "LTR Mark", abbr: "LRM", cat: "bidi" },
  0x200f: { name: "RTL Mark", abbr: "RLM", cat: "bidi" },
  0x2028: { name: "Line Separator", abbr: "LS", cat: "separator" },
  0x2029: { name: "Paragraph Separator", abbr: "PS", cat: "separator" },
  0x202a: { name: "LTR Embedding", abbr: "LRE", cat: "bidi" },
  0x202b: { name: "RTL Embedding", abbr: "RLE", cat: "bidi" },
  0x202c: { name: "Pop Dir. Formatting", abbr: "PDF", cat: "bidi" },
  0x202d: { name: "LTR Override", abbr: "LRO", cat: "bidi" },
  0x202e: { name: "RTL Override", abbr: "RLO", cat: "bidi" },
  0x202f: { name: "Narrow NBSP", abbr: "NNBS", cat: "space" },
  0x2060: { name: "Word Joiner", abbr: "WJ", cat: "format" },
  0x2061: { name: "Function Application", abbr: "FA", cat: "format" },
  0x2062: { name: "Invisible Times", abbr: "ITMS", cat: "format" },
  0x2063: { name: "Invisible Separator", abbr: "ISEP", cat: "format" },
  0x2064: { name: "Invisible Plus", abbr: "IPLS", cat: "format" },
  0xfeff: { name: "Byte Order Mark", abbr: "BOM", cat: "format" },
};

export function getCharInfo(cp: number): CharInfo {
  if (CHAR_DB[cp]) return CHAR_DB[cp];
  if (cp < 0x20)
    return {
      name: `Control U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      abbr: "CTRL",
      cat: "control",
    };
  if (cp === 0x7f) return { name: "Delete", abbr: "DEL", cat: "control" };
  if (cp >= 0x80 && cp <= 0x9f)
    return {
      name: `C1 Control U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      abbr: "C1",
      cat: "control",
    };
  if (cp >= 0xfe00 && cp <= 0xfe0f)
    return {
      name: `Variation Selector ${cp - 0xfe00 + 1}`,
      abbr: "VS",
      cat: "format",
    };
  return {
    name: `Unknown U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
    abbr: "???",
    cat: "format",
  };
}

export function classifyCodePoint(cp: number): CharType {
  if (cp === 0x09) return "tab";
  if (cp === 0x0a) return "newline";
  if (cp === 0x0d) return "cr";
  if (cp === 0x20) return "space";
  if (
    cp < 0x20 ||
    cp === 0x7f ||
    (cp >= 0x80 && cp <= 0x9f) ||
    cp === 0x00a0 ||
    cp === 0x00ad ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x2028 && cp <= 0x202f) ||
    (cp >= 0x2060 && cp <= 0x206f) ||
    cp === 0xfeff ||
    (cp >= 0xfe00 && cp <= 0xfe0f)
  )
    return "invisible";
  return "visible";
}

export interface AnalyzedChar {
  char: string;
  cp: number;
  index: number;
  type: CharType;
  hex: string;
  info?: CharInfo;
}

export interface InspectorResult {
  chars: AnalyzedChar[];
  totalCount: number;
  visibleCount: number;
  invisibleCount: number;
  invisibleByType: Record<
    string,
    { info: CharInfo; hex: string; positions: number[] }
  >;
  cleanText: string;
}

/** All detectable invisible character types (for showing 0-count rows) */
export const ALL_INVISIBLE_TYPES: { hex: string; info: CharInfo }[] = [
  ...Object.entries(CHAR_DB).map(([cp, info]) => ({
    hex: `U+${Number(cp).toString(16).toUpperCase().padStart(4, "0")}`,
    info,
  })),
  { hex: "U+0000-001F", info: { name: "Control Characters (excl. TAB/LF/CR)", abbr: "CTRL", cat: "control" } },
  { hex: "U+007F", info: { name: "Delete", abbr: "DEL", cat: "control" } },
  { hex: "U+0080-009F", info: { name: "C1 Control Characters", abbr: "C1", cat: "control" } },
  { hex: "U+FE00-FE0F", info: { name: "Variation Selectors", abbr: "VS", cat: "format" } },
];

export function analyzeText(text: string): InspectorResult {
  const units = Array.from(text);
  const chars: AnalyzedChar[] = units.map((char, index) => {
    const cp = char.codePointAt(0)!;
    const type = classifyCodePoint(cp);
    const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    return {
      char,
      cp,
      index,
      type,
      hex,
      info: type === "invisible" ? getCharInfo(cp) : undefined,
    };
  });

  const invisibleItems = chars.filter((c) => c.type === "invisible");
  const invisibleByType: InspectorResult["invisibleByType"] = {};
  invisibleItems.forEach(({ hex, info, index }) => {
    if (!invisibleByType[hex])
      invisibleByType[hex] = { info: info!, hex, positions: [] };
    invisibleByType[hex].positions.push(index);
  });

  const cleanText = chars
    .filter((c) => c.type !== "invisible")
    .map((c) => c.char)
    .join("");

  return {
    chars,
    totalCount: chars.length,
    visibleCount: chars.length - invisibleItems.length,
    invisibleCount: invisibleItems.length,
    invisibleByType,
    cleanText,
  };
}
