// Pure ledger logic: storage, parsing fallback and the numbers. No AI here, so totals are always exact.

const KEY = 'clario-lite:entries'
const SETTINGS = 'clario-lite:settings'

export function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveEntries(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function loadSettings() {
  try {
    return {currency: '₦', shop: 'My shop', ...JSON.parse(localStorage.getItem(SETTINGS) ?? '{}')}
  } catch {
    return {currency: '₦', shop: 'My shop'}
  }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS, JSON.stringify(s))
}

const num = s => Number(String(s).replace(/[^\d.]/g, '')) || 0

/** Turns model output (or anything) into a clean entry, or null. */
export function normalise(raw, text) {
  if (!raw || typeof raw !== 'object') return null
  const type = /exp|spent|bought|paid/i.test(raw.type ?? '') ? 'expense' : 'sale'
  const qty = Math.max(1, num(raw.qty ?? raw.quantity ?? 1))
  let unit = num(raw.unitPrice ?? raw.unit_price ?? raw.price ?? 0)
  let total = num(raw.total ?? raw.amount ?? 0)
  if (!total && unit) total = unit * qty
  if (!unit && total) unit = total / qty
  if (!total) return null
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type,
    item: String(raw.item ?? raw.product ?? 'item').slice(0, 60),
    qty,
    unitPrice: Math.round(unit * 100) / 100,
    total: Math.round(total * 100) / 100,
    party: String(raw.customer ?? raw.party ?? raw.supplier ?? '').slice(0, 40),
    text,
  }
}

/** First JSON object in a model reply. */
export function extractJson(reply) {
  const m = String(reply).match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

/** Works with no AI at all: "sold 3 rice 45000 each", "spent 2000 on transport". */
const WORDS = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, dozen: 12}

export function ruleParse(text) {
  const lower = text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\b/g, w => String(WORDS[w]))
  const partyMatch = lower.match(/\b(?:to|from)\s+([a-z][a-z\s]{1,30})$/)
  const t = partyMatch ? lower.slice(0, partyMatch.index) : lower
  const type = /\b(spent|spend|paid|pay|bought|buy|expense|cost)\b/.test(t) ? 'expense' : 'sale'
  const nums = [...t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k)?/g)].map(m => num(m[1]) * (m[2] ? 1000 : 1))
  if (!nums.length) return null
  const each = /\beach\b|\bper\b|@/.test(t)
  const qty = nums.length > 1 ? nums[0] : 1
  const price = nums.at(-1)
  const total = each ? qty * price : price
  const item =
    t
      .replace(/(\d[\d,]*(?:\.\d+)?)\s*k?/g, ' ')
      .replace(/\b(sold|sell|spent|spend|paid|pay|bought|buy|on|for|at|each|per|to|from|naira|ngn|usd|of|a|an|the|bags?|crates?|pieces?|pcs|cartons?|packs?|units?)\b/g, ' ')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 4)
      .join(' ') || 'item'
  return normalise({type, item, qty, total, party: partyMatch?.[1]?.trim() ?? ''}, text)
}

const DAY = 86_400_000

export function summary(entries, days = 7, now = Date.now()) {
  const since = now - days * DAY
  const recent = entries.filter(e => Date.parse(e.at) >= since)
  const sales = recent.filter(e => e.type === 'sale')
  const expenses = recent.filter(e => e.type === 'expense')
  const sum = xs => xs.reduce((a, e) => a + e.total, 0)
  const byItem = {}
  for (const e of sales) byItem[e.item] = (byItem[e.item] ?? 0) + e.total
  const top = Object.entries(byItem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const today = entries.filter(e => Date.parse(e.at) >= new Date(now).setHours(0, 0, 0, 0))
  return {
    days,
    salesTotal: sum(sales),
    expenseTotal: sum(expenses),
    profit: sum(sales) - sum(expenses),
    count: recent.length,
    topItems: top,
    todaySales: sum(today.filter(e => e.type === 'sale')),
    todayExpenses: sum(today.filter(e => e.type === 'expense')),
  }
}

export function money(n, currency) {
  return `${currency}${Math.round(n).toLocaleString('en-US')}`
}
