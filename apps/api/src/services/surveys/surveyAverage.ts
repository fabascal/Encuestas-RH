/** Average of the surveys that still count. Null when every one is marked off or the list is empty. */
export function consideredAverage(rows: Array<{ score: number; excluded: boolean }>): number | null {
  const scores = rows.filter((row) => !row.excluded && !Number.isNaN(row.score)).map((row) => row.score);
  if (scores.length === 0) return null;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 100) / 100;
}
