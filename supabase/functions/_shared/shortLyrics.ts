export const shortLyricLimits = (seconds: number) => ({
  maxWords: seconds <= 15 ? 20 : 40,
  maxLines: seconds <= 15 ? 4 : 6,
});
export function inspectShortLyric(body: string, seconds: number) {
  const clean = body.replace(/\[[^\]]*\]/g, "").trim();
  const words = clean ? clean.split(/\s+/u).length : 0;
  const lines = clean.split(/\r?\n/).filter((l) => l.trim()).length;
  const limits = shortLyricLimits(seconds);
  return {
    words,
    lines,
    ...limits,
    valid: words > 0 && words <= limits.maxWords && lines <= limits.maxLines,
  };
}
