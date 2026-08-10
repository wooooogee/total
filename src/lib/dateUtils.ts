/**
 * 다양한 날짜 형식(ISO 8601, 한국어 로케일 "2026. 8. 5. 오후 5:31:47" 등)의
 * 날짜 문자열을 타임스탬프(밀리초, number)로 안전하게 변환하는 헬퍼 함수
 */
export function parseDateStringToMs(dateStr?: string | null): number {
  if (!dateStr) return 0;

  const trimmed = dateStr.trim();
  if (!trimmed) return 0;

  // 1) ISO 8601 및 표준 날짜 문자열 파싱
  const directParsed = Date.parse(trimmed);
  if (!isNaN(directParsed)) {
    return directParsed;
  }

  // 2) 한국어 toLocaleString() format: "2026. 8. 5. 오후 5:31:47" 또는 "2026. 08. 05."
  const match = trimmed.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(오전|오후))?\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    const ampm = match[4];
    let hour = match[5] ? parseInt(match[5], 10) : 0;
    const minute = match[6] ? parseInt(match[6], 10) : 0;
    const second = match[7] ? parseInt(match[7], 10) : 0;

    if (ampm === '오후' && hour < 12) {
      hour += 12;
    } else if (ampm === '오전' && hour === 12) {
      hour = 0;
    }

    const d = new Date(year, month, day, hour, minute, second);
    const timeMs = d.getTime();
    if (!isNaN(timeMs)) {
      return timeMs;
    }
  }

  return 0;
}
