export interface HccFenceRange {
  language: "hcc-interaction" | "hcc-view" | "hcc-form" | "hcc-workbook" | "hcc-computed-field" | "hcc-radar-view" | "hcc-studio" | "hcc-exchange";
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  source: string;
}

export interface OffsetRange {
  from: number;
  to: number;
}

interface SourceLine {
  from: number;
  to: number;
  text: string;
}

const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*(hcc-interaction|hcc-view|hcc-form|hcc-workbook|hcc-computed-field|hcc-radar-view|hcc-studio|hcc-exchange)[ \t]*$/;

/**
 * Finds complete, literal hcc-interaction fences without parsing their YAML.
 * The scanner deliberately ignores indented code, suffix attributes, and
 * incomplete fences so that unsupported Markdown remains ordinary source.
 */
export function scanHccInteractionFences(document: string): HccFenceRange[] {
  const lines = sourceLines(document);
  const fences: HccFenceRange[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const opening = OPENING_FENCE.exec(lines[index].text);
    if (opening === null) {
      continue;
    }

    const marker = opening[1][0];
    const minimumLength = opening[1].length;
    const closingFence = new RegExp(`^ {0,3}\\${marker}{${minimumLength},}[ \\t]*$`);

    for (let closingIndex = index + 1; closingIndex < lines.length; closingIndex += 1) {
      const closing = lines[closingIndex];
      if (!closingFence.test(closing.text)) {
        continue;
      }

      const contentFrom = lineBreakEnd(document, lines[index].to);
      const contentTo = trimOneLineBreakBefore(document, closing.from);
      fences.push({
        language: opening[2] as HccFenceRange["language"],
        from: lines[index].from,
        to: closing.to,
        contentFrom,
        contentTo,
        source: document.slice(contentFrom, contentTo)
      });
      index = closingIndex;
      break;
    }
  }

  return fences;
}

export function rangesIntersect(left: OffsetRange, right: OffsetRange): boolean {
  return left.from <= right.to && right.from <= left.to;
}

export function fenceIsBeingEdited(
  fence: HccFenceRange,
  selections: readonly OffsetRange[]
): boolean {
  return selections.some((selection) => rangesIntersect(fence, selection));
}

export function fenceIsVisible(
  fence: HccFenceRange,
  visibleRanges: readonly OffsetRange[]
): boolean {
  return visibleRanges.some((visible) => rangesIntersect(fence, visible));
}

function sourceLines(document: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let from = 0;

  for (let cursor = 0; cursor <= document.length; cursor += 1) {
    if (cursor !== document.length && document[cursor] !== "\n") {
      continue;
    }

    let to = cursor;
    if (to > from && document[to - 1] === "\r") {
      to -= 1;
    }
    lines.push({ from, to, text: document.slice(from, to) });
    from = cursor + 1;
  }

  return lines;
}

function lineBreakEnd(document: string, lineEnd: number): number {
  if (document.slice(lineEnd, lineEnd + 2) === "\r\n") {
    return lineEnd + 2;
  }
  return document[lineEnd] === "\n" ? lineEnd + 1 : lineEnd;
}

function trimOneLineBreakBefore(document: string, position: number): number {
  if (document.slice(Math.max(0, position - 2), position) === "\r\n") {
    return position - 2;
  }
  return document[position - 1] === "\n" ? position - 1 : position;
}
