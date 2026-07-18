// 'needs_human' / 'human_active' are unused until the Instant plan's WhatsApp
// handoff is built, but the full enum is defined now so Session rows never
// need a migration to widen this column later.
export type SessionStatus = 'active' | 'needs_human' | 'human_active' | 'closed'
