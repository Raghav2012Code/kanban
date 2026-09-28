/**
 * Export and import, built on browser platform APIs so the bundle does not grow.
 *
 * Import deliberately reuses the board's own validity check rather than a second,
 * weaker one. A second validation path is a second set of rules, and the two drift.
 */

export function serialiseBoard(board: unknown): string {
  // Readable text, not minified: the point of an export is that a person can open
  // it, read it, and hand-edit it.
  return `${JSON.stringify(board, null, 2)}\n`;
}

export function downloadBoard(board: unknown, filename = 'noir-board.json'): void {
  const blob = new Blob([serialiseBoard(board)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately would race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function readBoardFile(file: File): Promise<unknown> {
  return file.text().then((text) => JSON.parse(text) as unknown);
}
