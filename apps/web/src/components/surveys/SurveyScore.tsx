export function SurveyScore({
  scoreText,
  score,
  formScoreText,
  naCount,
}: {
  scoreText: string | null;
  score: number | null;
  formScoreText: string | null;
  naCount: number;
}) {
  const differs = formScoreText !== null && formScoreText !== scoreText;
  const note = [
    naCount > 0 ? `${naCount} N/A no cuentan` : null,
    differs && formScoreText ? `Google: ${formScoreText}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <span className="block">
      <span className="block">
        {scoreText ?? 'Sin puntuación'}
        {score !== null ? ` · ${score.toFixed(1)} %` : ''}
      </span>
      {note && <span className="block text-xs text-muted">{note}</span>}
    </span>
  );
}
