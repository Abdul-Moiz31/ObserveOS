// Basic PII scrubbing for prompts/responses when piiScrubbing is enabled
// This is a best-effort implementation, not a guarantee

const EMAIL_REGEX    = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX    = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g
const SSN_REGEX      = /\b\d{3}-\d{2}-\d{4}\b/g
const CREDIT_REGEX   = /\b(?:\d[ -]?){13,16}\b/g
const IP_REGEX       = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g

export function scrubPII(text: string): string {
  return text
    .replace(EMAIL_REGEX,  '[EMAIL]')
    .replace(PHONE_REGEX,  '[PHONE]')
    .replace(SSN_REGEX,    '[SSN]')
    .replace(CREDIT_REGEX, '[CARD]')
    .replace(IP_REGEX,     '[IP]')
}
