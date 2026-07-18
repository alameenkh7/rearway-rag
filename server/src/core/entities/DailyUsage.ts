// Composite natural key (ipAddress, botId, date) — no synthetic id, matching
// the legacy schema exactly. Coarse, IP-based rate limiting; deliberately
// unchanged from the pre-existing Express app's daily_usage table.
export interface DailyUsage {
  ipAddress: string
  botId: string
  date: string // 'YYYY-MM-DD'
  messageCount: number
}
