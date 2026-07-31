export interface Chunk {
  source_id: string;
  source_url: string;
  clause_path: string;
  content: string;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapSentences?: number;
}

const HARD_MAX_CHARS = 1600;
const MIN_CHUNK_LENGTH = 200;

export function chunkDoc(
  doc: { id: string; url: string; text: string },
  opts?: ChunkOptions
): Chunk[] {
  const maxChars = opts?.maxChars ?? 1000;
  const overlapSentences = opts?.overlapSentences ?? 1;

  const lines = doc.text.split(/\r?\n/);

  // Find start: first line matching ^1\s+\S
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^1\s+\S/.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  const chunks: Chunk[] = [];
  let clausePath = '';
  let buffer: string[] = [];
  let pendingOverlapText = '';

  function isClauseHeader(line: string): boolean {
    return /^(\d+(?:\.\d+)*)\s+(\S.*)$/.test(line.trim());
  }

  function getClauseInfo(line: string): string {
    const match = line.trim().match(/^(\d+(?:\.\d+)*)\s+(\S.*)$/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
    return '';
  }

  function isListItem(line: string): boolean {
    const trimmed = line.trim();
    return (
      /^[a-z]\)\s/.test(trimmed) ||
      /^[-•]\s/.test(trimmed) ||
      /^\d+\)\s/.test(trimmed)
    );
  }

  function getLastSentences(text: string, n: number): string[] {
    const sentences = text
      .split(/([.!?]+)/)
      .reduce((acc: string[], part, idx, arr) => {
        if (idx % 2 === 0 && part.trim()) {
          const sentence = part + (arr[idx + 1] || '');
          if (sentence.trim()) acc.push(sentence.trim());
        }
        return acc;
      }, []);
    return sentences.slice(-n);
  }

  function flushBuffer(): void {
    const content = buffer.join('\n').trim();
    if (content && content.length >= MIN_CHUNK_LENGTH) {
      chunks.push({
        source_id: doc.id,
        source_url: doc.url,
        clause_path: clausePath,
        content,
      });
      const lastSentences = getLastSentences(content, overlapSentences);
      pendingOverlapText = lastSentences.join(' ');
    }
    buffer = [];
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (buffer.length > 0 && buffer[buffer.length - 1].trim()) {
        buffer.push('');
      }
      continue;
    }

    if (isClauseHeader(line)) {
      if (buffer.length > 0) {
        flushBuffer();
      }
      clausePath = getClauseInfo(line);
      buffer = [];
      pendingOverlapText = '';
      continue;
    }

    const isListLine = isListItem(line);
    const currentLength = buffer.join('\n').length;
    const wouldExceed = currentLength + line.length + 1 > maxChars && buffer.length > 0;
    const wouldExceedHardLimit = currentLength + line.length + 1 > HARD_MAX_CHARS && buffer.length > 0;

    if (wouldExceedHardLimit) {
      // Hard limit: always flush
      flushBuffer();
      // Only add overlap if it won't exceed hard limit with new line
      if (pendingOverlapText && pendingOverlapText.length + line.length + 1 < HARD_MAX_CHARS) {
        buffer.push(pendingOverlapText);
      }
      buffer.push(line);
    } else if (wouldExceed && !isListLine) {
      // Soft limit: flush only for non-list items
      flushBuffer();
      if (pendingOverlapText) {
        buffer.push(pendingOverlapText);
      }
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    const content = buffer.join('\n').trim();
    if (content && content.length >= MIN_CHUNK_LENGTH) {
      chunks.push({
        source_id: doc.id,
        source_url: doc.url,
        clause_path: clausePath,
        content,
      });
    }
  }

  return chunks;
}
