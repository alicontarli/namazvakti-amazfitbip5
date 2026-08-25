import { getTranslation, TRANSLATIONS } from './i18n'

export const CACHE_KEY = 'prayer_times_cache'

export const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export function getPrayerRows(lang = 'en') {
  const t = getTranslation(lang)
  return [
    { key: 'Fajr', label: t.fajr },
    { key: 'Dhuhr', label: t.dhuhr },
    { key: 'Asr', label: t.asr },
    { key: 'Maghrib', label: t.maghrib },
    { key: 'Isha', label: t.isha }
  ]
}

export const FALLBACK_SCHEDULE = {
  city: 'Istanbul',
  country: 'Turkey',
  year: 2026,
  language: 'en',
  source: 'fallback',
  timings: {
    Fajr: '04:44',
    Dhuhr: '13:11',
    Asr: '16:56',
    Maghrib: '19:55',
    Isha: '21:21'
  },
  days: {
    'default': ['04:44', '13:11', '16:56', '19:55', '21:21']
  }
}

export function sanitizeTimeText(value) {
  if (!value) {
    return '--:--'
  }

  const clean = String(value).split(' ')[0]
  const matched = clean.match(/^(\d{1,2}):(\d{2})/)
  if (!matched) {
    return '--:--'
  }

  return matched[1].padStart(2, '0') + ':' + matched[2]
}

export function formatDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

/**
 * Returns prayer timings object { Fajr, Dhuhr, Asr, Maghrib, Isha } for a given date.
 */
export function getTimingsForDate(payload, targetDate = new Date()) {
  const safePayload = payload || FALLBACK_SCHEDULE
  const dateKey = formatDateKey(targetDate)

  if (safePayload.days && safePayload.days[dateKey]) {
    const arr = safePayload.days[dateKey]
    if (Array.isArray(arr)) {
      return {
        Fajr: sanitizeTimeText(arr[0]),
        Dhuhr: sanitizeTimeText(arr[1]),
        Asr: sanitizeTimeText(arr[2]),
        Maghrib: sanitizeTimeText(arr[3]),
        Isha: sanitizeTimeText(arr[4])
      }
    }
  }

  if (safePayload.timings && safePayload.timings.Fajr) {
    return {
      Fajr: sanitizeTimeText(safePayload.timings.Fajr),
      Dhuhr: sanitizeTimeText(safePayload.timings.Dhuhr),
      Asr: sanitizeTimeText(safePayload.timings.Asr),
      Maghrib: sanitizeTimeText(safePayload.timings.Maghrib),
      Isha: sanitizeTimeText(safePayload.timings.Isha)
    }
  }

  return FALLBACK_SCHEDULE.timings
}

/**
 * Normalizes raw payload from cache or BLE into standard format.
 */
export function normalizePayload(rawValue) {
  try {
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    if (!parsed) return FALLBACK_SCHEDULE

    return {
      city: parsed.city || FALLBACK_SCHEDULE.city,
      country: parsed.country || FALLBACK_SCHEDULE.country,
      year: parsed.year || new Date().getFullYear(),
      language: parsed.language || 'en',
      source: parsed.source || 'cache',
      syncDate: parsed.syncDate || '',
      days: parsed.days || {},
      timings: parsed.timings || getTimingsForDate(parsed, new Date())
    }
  } catch (error) {
    return FALLBACK_SCHEDULE
  }
}

/**
 * Merges incoming payload into existing cache.
 * If city or country changed, replaces days with new location schedule.
 */
export function mergePayloads(existingPayload, incomingPayload) {
  const base = normalizePayload(existingPayload)
  const incoming = normalizePayload(incomingPayload)

  let mergedDays = incoming.days || {}
  if (base.city === incoming.city && base.country === incoming.country) {
    mergedDays = Object.assign({}, base.days || {}, incoming.days || {})
  }

  return {
    city: incoming.city || base.city,
    country: incoming.country || base.country,
    year: incoming.year || base.year,
    language: incoming.language || base.language || 'en',
    source: incoming.source || 'cache',
    syncDate: incoming.syncDate || base.syncDate,
    days: mergedDays,
    timings: incoming.timings || getTimingsForDate({ days: mergedDays }, new Date())
  }
}

export function buildPrayerTimestamp(timeText, baseDate, addDay = 0) {
  const now = baseDate ? new Date(baseDate) : new Date()
  const parts = String(timeText).split(':')
  const hour = Number(parts[0] || 0)
  const minute = Number(parts[1] || 0)

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + addDay,
    hour,
    minute,
    0,
    0
  ).getTime()
}

/**
 * Calculates next upcoming prayer and milliseconds remaining.
 */
export function getNextPrayer(payload, nowMs = Date.now()) {
  const nowDate = new Date(nowMs)
  const lang = (payload && payload.language) || 'en'
  const t = getTranslation(lang)
  const rows = getPrayerRows(lang)
  const todayTimings = getTimingsForDate(payload, nowDate)

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const prayerTime = buildPrayerTimestamp(todayTimings[row.key], nowDate, 0)

    if (prayerTime > nowMs) {
      return {
        key: row.key,
        label: row.label,
        time: todayTimings[row.key],
        diffMs: prayerTime - nowMs,
        todayTimings
      }
    }
  }

  const tomorrowDate = new Date(nowMs + 24 * 60 * 60 * 1000)
  const tomorrowTimings = getTimingsForDate(payload, tomorrowDate)
  const tomorrowFajrTime = buildPrayerTimestamp(tomorrowTimings.Fajr, nowDate, 1)

  return {
    key: 'Fajr',
    label: t.fajr,
    time: tomorrowTimings.Fajr,
    diffMs: Math.max(0, tomorrowFajrTime - nowMs),
    todayTimings
  }
}

/**
 * Calculates previous prayer that already occurred today.
 */
export function getPreviousPrayer(payload, nowMs = Date.now()) {
  const nowDate = new Date(nowMs)
  const lang = (payload && payload.language) || 'en'
  const t = getTranslation(lang)
  const rows = getPrayerRows(lang)
  const todayTimings = getTimingsForDate(payload, nowDate)
  let previous = null

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const prayerTime = buildPrayerTimestamp(todayTimings[row.key], nowDate, 0)

    if (prayerTime <= nowMs) {
      previous = {
        key: row.key,
        label: row.label,
        time: todayTimings[row.key],
        timeMs: prayerTime
      }
    }
  }

  if (previous) {
    return previous
  }

  const yesterdayDate = new Date(nowMs - 24 * 60 * 60 * 1000)
  const yesterdayTimings = getTimingsForDate(payload, yesterdayDate)
  return {
    key: 'Isha',
    label: t.isha,
    time: yesterdayTimings.Isha,
    timeMs: buildPrayerTimestamp(yesterdayTimings.Isha, nowDate, -1)
  }
}

export function formatCountdown(diffMs) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0')
  )
}

export function formatCompactCountdown(diffMs) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
}

export function getMinuteBadge(payload, nextPrayer, nowMs = Date.now()) {
  const previousPrayer = getPreviousPrayer(payload, nowMs)
  const elapsedMinutes = Math.floor((nowMs - previousPrayer.timeMs) / 60000)

  if (elapsedMinutes >= 0 && elapsedMinutes <= 5) {
    return '+' + String(Math.max(1, elapsedMinutes))
  }

  const remainingMinutes = Math.ceil(nextPrayer.diffMs / 60000)

  if (remainingMinutes > 99) {
    return '99+'
  }

  return String(remainingMinutes)
}

/**
 * Calculates schedule expiration date and localized human-readable status text.
 */
export function getScheduleValidity(payload, nowDate = new Date()) {
  const lang = (payload && payload.language) || 'en'
  const t = getTranslation(lang)

  if (!payload || !payload.days || typeof payload.days !== 'object' || payload.source === 'fallback') {
    return {
      hasData: false,
      remainingDays: 0,
      lastDateFormatted: '',
      statusText: payload && payload.source === 'fallback' ? t.demoData : t.updateNeeded,
      isWarning: true
    }
  }

  const keys = Object.keys(payload.days).filter(k => k.match(/^\d{2}-\d{2}$/))
  if (keys.length === 0) {
    return {
      hasData: false,
      remainingDays: 0,
      lastDateFormatted: '',
      statusText: t.updateNeeded,
      isWarning: true
    }
  }

  let remainingDays = 0
  let lastFutureDate = null

  for (let i = 0; i < 366; i += 1) {
    const target = new Date(nowDate.getTime() + i * 24 * 60 * 60 * 1000)
    const k = formatDateKey(target)
    if (payload.days[k]) {
      remainingDays += 1
      lastFutureDate = target
    } else if (i > 0) {
      break
    }
  }

  let lastDateFormatted = ''
  if (lastFutureDate) {
    const d = lastFutureDate.getDate()
    const monthIndex = lastFutureDate.getMonth()
    const monthName = t.months && t.months[monthIndex] ? t.months[monthIndex] : `${monthIndex + 1}`
    lastDateFormatted = `${d} ${monthName}`
  }

  let statusText = ''
  let isWarning = false

  if (remainingDays <= 0) {
    statusText = t.updateNeeded
    isWarning = true
  } else if (remainingDays <= 3) {
    statusText = `${t.lastPrefix} ${remainingDays} ${t.daysSuffix}`
    isWarning = true
  } else {
    statusText = `${t.lastPrefix} ${lastDateFormatted} (${remainingDays} ${t.daysSuffix})`
    isWarning = false
  }

  return {
    hasData: true,
    remainingDays,
    lastDateFormatted,
    statusText,
    isWarning
  }
}
