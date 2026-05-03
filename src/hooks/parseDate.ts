// Parse natural language date hints from task title.
// Returns { title: cleaned title, dueDate: Date string or null }

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function addDays(n: number): string {
  const d = new Date(Date.now() + n * 86400000)
  return d.toISOString().split('T')[0]
}

function nextWeekday(targetDay: number): string {
  // targetDay: 0=Sun, 1=Mon, ... 6=Sat
  const today = new Date()
  const currentDay = today.getDay()
  let diff = targetDay - currentDay
  if (diff <= 0) diff += 7
  return addDays(diff)
}

interface ParseResult {
  title: string
  dueDate: string | null
}

export function parseDateHint(input: string): ParseResult {
  let title = input.trim()
  if (!title) return { title, dueDate: null }

  // Try to match date suffix patterns: "task title @date"
  // Match: 今天, 明天, 后天, 大后天, 下周X, 周X, 周末, 下个月, X月X日

  // 大后天 (3 days from now)
  const dahoutian = /(.*?)\s*大后天\s*$/
  if (dahoutian.test(title)) {
    return { title: title.replace(dahoutian, '$1').trim(), dueDate: addDays(3) }
  }

  // 后天 (2 days from now)
  const houtian = /(.*?)\s*后天\s*$/
  if (houtian.test(title)) {
    return { title: title.replace(houtian, '$1').trim(), dueDate: addDays(2) }
  }

  // 明天
  const mingtian = /(.*?)\s*明天\s*$/
  if (mingtian.test(title)) {
    return { title: title.replace(mingtian, '$1').trim(), dueDate: addDays(1) }
  }

  // 今天
  const jintian = /(.*?)\s*今天\s*$/
  if (jintian.test(title)) {
    return { title: title.replace(jintian, '$1').trim(), dueDate: todayStr() }
  }

  // 下周一, 下周二, ... 下周日
  const nextWeek = /(.*?)\s*下周([一二三四五六日天])\s*$/
  const nwMatch = title.match(nextWeek)
  if (nwMatch) {
    let day = WEEKDAYS.indexOf(nwMatch[2])
    if (day === -1 || nwMatch[2] === '天') day = 0 // 天 = Sunday
    return { title: nwMatch[1].trim(), dueDate: nextWeekday(day) }
  }

  // 周一, 周二, ...
  const thisWeek = /(.*?)\s*周([一二三四五六日天])\s*$/
  const twMatch = title.match(thisWeek)
  if (twMatch) {
    let day = WEEKDAYS.indexOf(twMatch[2])
    if (day === -1 || twMatch[2] === '天') day = 0
    const target = nextWeekday(day)
    // If it's within 2 days, treat as "this week" (the soonest upcoming)
    return { title: twMatch[1].trim(), dueDate: target }
  }

  // 周末 (next Saturday)
  const weekend = /(.*?)\s*周末\s*$/
  if (weekend.test(title)) {
    return { title: title.replace(weekend, '$1').trim(), dueDate: nextWeekday(6) }
  }

  // X月X日 / X月X号
  const monthDay = /(.*?)\s*(\d{1,2})月(\d{1,2})[日号]\s*$/
  const mdMatch = title.match(monthDay)
  if (mdMatch) {
    const year = new Date().getFullYear()
    const month = parseInt(mdMatch[2]).toString().padStart(2, '0')
    const day = parseInt(mdMatch[3]).toString().padStart(2, '0')
    return { title: mdMatch[1].trim(), dueDate: `${year}-${month}-${day}` }
  }

  return { title, dueDate: null }
}
