import { createHash } from 'crypto'

export function hashPrompt(prompt: string): string {
  const normalized = prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
