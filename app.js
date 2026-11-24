import {
  extractJson,
  loadEntries,
  loadSettings,
  money,
  normalise,
  ruleParse,
  saveEntries,
  saveSettings,
  summary,
} from './ledger.js'

const $ = id => document.getElementById(id)
const els = {
  shop: $('shop'),
  engine: $('engine'),
  net: $('net'),
  input: $('entry-input'),
  record: $('record-btn'),
  mic: $('mic-btn'),
  status: $('status'),
  list: $('list'),
  todaySales: $('today-sales'),
  weekSales: $('week-sales'),
  weekExp: $('week-exp'),
  weekProfit: $('week-profit'),
  top: $('top-items'),
  advise: $('advise-btn'),
  advice: $('advice'),
  currency: $('currency'),
  clear: $('clear-btn'),
}

let entries = loadEntries()
let settings = loadSettings()
let ai = null // loaded lazily so the ledger still works with no network at all

async function loadAi() {
  if (ai) return ai
  try {
    ai = await import('./ai.js')
  } catch (err) {
    console.warn('AI unavailable, using rule parser only.', err)
    ai = null
  }
  return ai
}

async function refreshEngine() {
  const m = await loadAi()
  let label = 'Offline rules'
  let cls = 'rules'
  if (m) {
    const s = await m.engineStatus()
    if (s === 'device') [label, cls] = ['On-device AI · private', 'device']
    else if (s === 'downloading') [label, cls] = ['Downloading on-device AI…', 'cloud']
    else if (navigator.onLine) [label, cls] = ['Cloud AI', 'cloud']
  }
  els.engine.textContent = label
  els.engine.className = `badge ${cls}`
  els.net.textContent = navigator.onLine ? 'Online' : 'Offline'
  els.net.className = `badge ${navigator.onLine ? 'online' : 'offline'}`
}

const PARSE_PROMPT = text => `You are a bookkeeping assistant for a small shop.
Convert the shopkeeper's note into ONE JSON object and nothing else.
Fields: "type" ("sale" or "expense"), "item" (short noun), "qty" (number), "unitPrice" (number or null), "total" (number), "customer" (name or "").
Numbers are plain digits with no currency symbols; "45k" means 45000.
Note: "${text.replace(/"/g, "'")}"`

async function parse(text) {
  const m = await loadAi()
  if (m) {
    try {
      const reply = await m.generate(PARSE_PROMPT(text))
      const entry = normalise(extractJson(reply), text)
      if (entry) return {entry, via: 'ai'}
    } catch (err) {
      console.warn('AI parse failed, falling back to rules.', err)
    }
  }
  return {entry: ruleParse(text), via: 'rules'}
}

async function record() {
  const text = els.input.value.trim()
  if (!text) return
  els.record.disabled = true
  els.status.textContent = 'Understanding…'
  ai?.prepareDeviceModel?.(p => {
    els.engine.textContent = `Downloading on-device AI ${Math.round(p * 100)}%`
  })
  const {entry, via} = await parse(text)
  els.record.disabled = false
  if (!entry) {
    els.status.textContent = 'I couldn’t find an amount. Try “Sold 2 bags of rice at 45,000 each”.'
    return
  }
  entries.unshift(entry)
  saveEntries(entries)
  els.input.value = ''
  els.status.textContent = `Recorded ${entry.type}: ${entry.qty} × ${entry.item} = ${money(entry.total, settings.currency)}${via === 'rules' ? ' (offline rules)' : ''}`
  render()
  refreshEngine()
}

async function advise() {
  const s = summary(entries)
  if (!s.count) {
    els.advice.textContent = 'Record a few sales first, then ask again.'
    return
  }
  const m = await loadAi()
  const c = settings.currency
  const facts = `Last ${s.days} days: sales ${money(s.salesTotal, c)}, expenses ${money(s.expenseTotal, c)}, profit ${money(s.profit, c)}, ${s.count} records. Top sellers: ${s.topItems.map(([i, v]) => `${i} (${money(v, c)})`).join(', ') || 'none'}. Today: sales ${money(s.todaySales, c)}, expenses ${money(s.todayExpenses, c)}.`
  if (!m) {
    els.advice.textContent = facts
    return
  }
  els.advise.disabled = true
  els.advice.textContent = 'Thinking…'
  try {
    const reply = await m.generate(
      `You advise a small shop owner. Use ONLY these exact figures; do not invent numbers.\n${facts}\nGive 3 short, practical tips (one line each, start each with "• "). Plain language.`,
    )
    els.advice.textContent = reply.trim()
  } catch (err) {
    console.warn(err)
    els.advice.textContent = facts
  }
  els.advise.disabled = false
}

function render() {
  const c = settings.currency
  const s = summary(entries)
  els.todaySales.textContent = money(s.todaySales, c)
  els.weekSales.textContent = money(s.salesTotal, c)
  els.weekExp.textContent = money(s.expenseTotal, c)
  els.weekProfit.textContent = money(s.profit, c)
  els.weekProfit.classList.toggle('neg', s.profit < 0)
  els.top.textContent = s.topItems.length
    ? `Top sellers: ${s.topItems.map(([i, v]) => `${i} ${money(v, c)}`).join(' · ')}`
    : ''
  els.list.replaceChildren()
  for (const e of entries.slice(0, 50)) {
    const li = document.createElement('li')
    li.className = e.type
    const main = document.createElement('div')
    const title = document.createElement('b')
    title.textContent = `${e.qty} × ${e.item}`
    const meta = document.createElement('small')
    meta.textContent = `${new Date(e.at).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})}${e.party ? ` · ${e.party}` : ''}`
    main.append(title, meta)
    const amt = document.createElement('span')
    amt.className = 'amt'
    amt.textContent = `${e.type === 'expense' ? '−' : '+'}${money(e.total, c)}`
    const del = document.createElement('button')
    del.type = 'button'
    del.className = 'del'
    del.setAttribute('aria-label', `Delete ${e.item}`)
    del.textContent = '×'
    del.onclick = () => {
      entries = entries.filter(x => x.id !== e.id)
      saveEntries(entries)
      render()
    }
    li.append(main, amt, del)
    els.list.append(li)
  }
  if (!entries.length) {
    const li = document.createElement('li')
    li.className = 'empty'
    li.textContent = 'No records yet. Try: “Sold 3 bags of rice at 45k each to Mama Bisi”.'
    els.list.append(li)
  }
}

function setupMic() {
  const SR = self.SpeechRecognition || self.webkitSpeechRecognition
  if (!SR) {
    els.mic.hidden = true
    return
  }
  els.mic.onclick = () => {
    const r = new SR()
    r.lang = navigator.language || 'en-US'
    r.onresult = ev => {
      els.input.value = ev.results[0][0].transcript
      els.status.textContent = 'Heard you. Press Record to save it.'
    }
    r.onerror = () => {
      els.status.textContent = 'Voice input needs a connection; type instead.'
    }
    r.start()
    els.status.textContent = 'Listening…'
  }
}

els.shop.textContent = settings.shop
els.shop.onblur = () => {
  settings.shop = els.shop.textContent.trim() || 'My shop'
  saveSettings(settings)
}
els.currency.value = settings.currency
els.currency.onchange = () => {
  settings.currency = els.currency.value
  saveSettings(settings)
  render()
}
els.record.onclick = () => void record()
els.input.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault()
    void record()
  }
})
els.advise.onclick = () => void advise()
els.clear.onclick = () => {
  if (!entries.length) return
  entries = []
  saveEntries(entries)
  render()
}
addEventListener('online', refreshEngine)
addEventListener('offline', refreshEngine)
setupMic()
render()
void refreshEngine()
