export interface DiffLine {
  type: "same" | "add" | "remove";
  text: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  let oi = 0;
  let ni = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ type: "add", text: newLines[ni], oldLineNumber: null, newLineNumber: newLineNum++ });
      ni++;
    } else if (ni >= newLines.length) {
      result.push({ type: "remove", text: oldLines[oi], oldLineNumber: oldLineNum++, newLineNumber: null });
      oi++;
    } else if (oldLines[oi] === newLines[ni]) {
      result.push({ type: "same", text: oldLines[oi], oldLineNumber: oldLineNum++, newLineNumber: newLineNum++ });
      oi++;
      ni++;
    } else {
      let foundInNew = -1;
      let foundInOld = -1;
      for (let j = ni + 1; j < Math.min(ni + 5, newLines.length); j++) {
        if (newLines[j] === oldLines[oi]) { foundInNew = j; break; }
      }
      for (let j = oi + 1; j < Math.min(oi + 5, oldLines.length); j++) {
        if (oldLines[j] === newLines[ni]) { foundInOld = j; break; }
      }

      if (foundInNew >= 0 && (foundInOld < 0 || foundInNew - ni <= foundInOld - oi)) {
        for (let j = ni; j < foundInNew; j++) {
          result.push({ type: "add", text: newLines[j], oldLineNumber: null, newLineNumber: newLineNum++ });
        }
        ni = foundInNew;
      } else if (foundInOld >= 0) {
        for (let j = oi; j < foundInOld; j++) {
          result.push({ type: "remove", text: oldLines[j], oldLineNumber: oldLineNum++, newLineNumber: null });
        }
        oi = foundInOld;
      } else {
        result.push({ type: "remove", text: oldLines[oi], oldLineNumber: oldLineNum++, newLineNumber: null });
        result.push({ type: "add", text: newLines[ni], oldLineNumber: null, newLineNumber: newLineNum++ });
        oi++;
        ni++;
      }
    }
  }

  return result;
}

export function computeUnifiedDiffString(oldText: string, newText: string, filePath: string): string {
  const diff = computeDiff(oldText, newText);
  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  for (const line of diff) {
    if (line.type === "same") {
      lines.push(` ${line.text}`);
    } else if (line.type === "add") {
      lines.push(`+${line.text}`);
    } else {
      lines.push(`-${line.text}`);
    }
  }

  return lines.join("\n");
}

export function computeDiffStats(oldText: string, newText: string): { additions: number; deletions: number } {
  const diff = computeDiff(oldText, newText);
  let additions = 0;
  let deletions = 0;
  for (const line of diff) {
    if (line.type === "add") additions++;
    if (line.type === "remove") deletions++;
  }
  return { additions, deletions };
}
