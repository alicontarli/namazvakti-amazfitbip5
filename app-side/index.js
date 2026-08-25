import { MessageBuilder } from '../shared/message-side'

const DEFAULT_COUNTRY = 'Turkey'
const DEFAULT_CITY = 'Istanbul'
const DEFAULT_LANGUAGE = 'en'
const messageBuilder = new MessageBuilder()
const BASE_URLS = [
  'https://api.aladhan.com/v1/',
  'http://api.aladhan.com/v1/'
]

let isSyncing = false
let syncDebounceTimer = null

function unwrapSettingValue(value, fallbackValue) {
  if (value === null || value === undefined || value === '') {
    return fallbackValue
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? unwrapSettingValue(value[0], fallbackValue) : fallbackValue
  }

  if (typeof value === 'object' && value !== null) {
    return value.value || value.name || fallbackValue
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') {
        return unwrapSettingValue(parsed, fallbackValue)
      }
      if (typeof parsed === 'string') {
        return parsed
      }
    } catch (error) {}
    return value
  }

  return String(value)
}

function readSettingValue(key, fallbackValue) {
  const value = settings.settingsStorage.getItem(key)
  return unwrapSettingValue(value, fallbackValue)
}

function writeSettingValue(key, value) {
  settings.settingsStorage.setItem(key, value)
}

function setDebugStage(stage) {
  writeSettingValue('debug_stage', stage)
}

function normalizeApiTime(value) {
  return String(value || '--:--').split(' ')[0]
}

function getTodayApiDate() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  return day + '-' + month + '-' + year
}

function formatError(error) {
  const message = error && error.message ? error.message : String(error || 'unknown error')
  return message.length > 120 ? message.slice(0, 117) + '...' : message
}

function extractRollingWindow(fullDaysMap, windowDays = 60) {
  const now = new Date()
  const windowMap = {}
  const todayKey = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  for (let i = 0; i < windowDays; i += 1) {
    const targetDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    const m = String(targetDate.getMonth() + 1).padStart(2, '0')
    const d = String(targetDate.getDate()).padStart(2, '0')
    const key = m + '-' + d

    if (fullDaysMap[key]) {
      windowMap[key] = fullDaysMap[key]
    }
  }

  if (!windowMap[todayKey] && fullDaysMap[todayKey]) {
    windowMap[todayKey] = fullDaysMap[todayKey]
  }

  return windowMap
}

async function fetchFullYearSingleRequest(baseUrl, year, country, city) {
  const url = (
    baseUrl +
    'calendarByCity/' +
    year +
    '?city=' +
    encodeURIComponent(city) +
    '&country=' +
    encodeURIComponent(country) +
    '&method=13'
  )

  setDebugStage('fetch:year_single')
  const response = await fetch({
    url,
    method: 'GET'
  })

  const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body

  if (!json || Number(json.code) !== 200 || !json.data || typeof json.data !== 'object') {
    throw new Error('Yillik tekil veri gecersiz')
  }

  const fullDaysMap = {}
  let todayTimings = null
  const now = new Date()
  const todayKey = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  for (let m = 1; m <= 12; m += 1) {
    const monthList = json.data[String(m)] || json.data[m]
    if (!Array.isArray(monthList)) continue

    for (let d = 0; d < monthList.length; d += 1) {
      const item = monthList[d]
      const greg = item.date && item.date.gregorian
      if (!greg || !item.timings) continue

      const monthNum = String(greg.month && greg.month.number ? greg.month.number : m).padStart(2, '0')
      const dayNum = String(greg.day || d + 1).padStart(2, '0')
      const dateKey = monthNum + '-' + dayNum

      const timingsArr = [
        normalizeApiTime(item.timings.Fajr),
        normalizeApiTime(item.timings.Dhuhr),
        normalizeApiTime(item.timings.Asr),
        normalizeApiTime(item.timings.Maghrib),
        normalizeApiTime(item.timings.Isha)
      ]

      fullDaysMap[dateKey] = timingsArr

      if (dateKey === todayKey) {
        todayTimings = {
          Fajr: timingsArr[0],
          Dhuhr: timingsArr[1],
          Asr: timingsArr[2],
          Maghrib: timingsArr[3],
          Isha: timingsArr[4]
        }
      }
    }
  }

  const daysCount = Object.keys(fullDaysMap).length
  if (daysCount < 200) {
    throw new Error('Yillik veri eksik: ' + daysCount + ' gun')
  }

  const rollingDays = extractRollingWindow(fullDaysMap, 60)

  return {
    city,
    country,
    year,
    source: 'side-service',
    syncDate: getTodayApiDate(),
    daysCount: Object.keys(rollingDays).length,
    days: rollingDays,
    timings: todayTimings || {
      Fajr: fullDaysMap[todayKey] ? fullDaysMap[todayKey][0] : '04:44',
      Dhuhr: fullDaysMap[todayKey] ? fullDaysMap[todayKey][1] : '13:11',
      Asr: fullDaysMap[todayKey] ? fullDaysMap[todayKey][2] : '16:56',
      Maghrib: fullDaysMap[todayKey] ? fullDaysMap[todayKey][3] : '19:55',
      Isha: fullDaysMap[todayKey] ? fullDaysMap[todayKey][4] : '21:21'
    }
  }
}

async function fetchCurrentMonthFallback(baseUrl, year, month, country, city) {
  const url = (
    baseUrl +
    'calendarByCity/' +
    year +
    '/' +
    month +
    '?city=' +
    encodeURIComponent(city) +
    '&country=' +
    encodeURIComponent(country) +
    '&method=13'
  )

  setDebugStage('fetch:month_fallback')
  const response = await fetch({
    url,
    method: 'GET'
  })

  const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body

  if (!json || Number(json.code) !== 200 || !Array.isArray(json.data)) {
    throw new Error('Aylik veri gecersiz')
  }

  const daysMap = {}
  let todayTimings = null
  const now = new Date()
  const todayKey = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  for (let d = 0; d < json.data.length; d += 1) {
    const item = json.data[d]
    const greg = item.date && item.date.gregorian
    if (!greg || !item.timings) continue

    const monthNum = String(greg.month && greg.month.number ? greg.month.number : month).padStart(2, '0')
    const dayNum = String(greg.day || d + 1).padStart(2, '0')
    const dateKey = monthNum + '-' + dayNum

    const timingsArr = [
      normalizeApiTime(item.timings.Fajr),
      normalizeApiTime(item.timings.Dhuhr),
      normalizeApiTime(item.timings.Asr),
      normalizeApiTime(item.timings.Maghrib),
      normalizeApiTime(item.timings.Isha)
    ]

    daysMap[dateKey] = timingsArr

    if (dateKey === todayKey) {
      todayTimings = {
        Fajr: timingsArr[0],
        Dhuhr: timingsArr[1],
        Asr: timingsArr[2],
        Maghrib: timingsArr[3],
        Isha: timingsArr[4]
      }
    }
  }

  return {
    city,
    country,
    year,
    source: 'side-service',
    syncDate: getTodayApiDate(),
    daysCount: Object.keys(daysMap).length,
    days: daysMap,
    timings: todayTimings || {
      Fajr: daysMap[todayKey] ? daysMap[todayKey][0] : '04:44',
      Dhuhr: daysMap[todayKey] ? daysMap[todayKey][1] : '13:11',
      Asr: daysMap[todayKey] ? daysMap[todayKey][2] : '16:56',
      Maghrib: daysMap[todayKey] ? daysMap[todayKey][3] : '19:55',
      Isha: daysMap[todayKey] ? daysMap[todayKey][4] : '21:21'
    }
  }
}

async function fetchSingleDayFallback(baseUrl, country, city) {
  const datePath = getTodayApiDate()
  const url = (
    baseUrl +
    'timingsByCity/' +
    datePath +
    '?city=' +
    encodeURIComponent(city) +
    '&country=' +
    encodeURIComponent(country) +
    '&method=13'
  )

  setDebugStage('fetch:day_fallback')
  const response = await fetch({
    url,
    method: 'GET'
  })

  const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body

  if (!json || Number(json.code) !== 200 || !json.data || !json.data.timings) {
    throw new Error('Gunluk veri gecersiz')
  }

  const now = new Date()
  const todayKey = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const timings = {
    Fajr: normalizeApiTime(json.data.timings.Fajr),
    Dhuhr: normalizeApiTime(json.data.timings.Dhuhr),
    Asr: normalizeApiTime(json.data.timings.Asr),
    Maghrib: normalizeApiTime(json.data.timings.Maghrib),
    Isha: normalizeApiTime(json.data.timings.Isha)
  }

  const daysMap = {}
  daysMap[todayKey] = [timings.Fajr, timings.Dhuhr, timings.Asr, timings.Maghrib, timings.Isha]

  return {
    city,
    country,
    year: now.getFullYear(),
    source: 'side-service',
    syncDate: datePath,
    daysCount: 1,
    days: daysMap,
    timings
  }
}

async function fetchResilientPrayerTimes(country, city) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  let lastError = null

  for (let u = 0; u < BASE_URLS.length; u += 1) {
    const baseUrl = BASE_URLS[u]

    try {
      const result = await fetchFullYearSingleRequest(baseUrl, year, country, city)
      setDebugStage('fetch:ok:60d')
      return result
    } catch (e1) {
      lastError = e1
    }

    try {
      const result = await fetchCurrentMonthFallback(baseUrl, year, month, country, city)
      setDebugStage('fetch:ok:month')
      return result
    } catch (e2) {
      lastError = e2
    }

    try {
      const result = await fetchSingleDayFallback(baseUrl, country, city)
      setDebugStage('fetch:ok:day')
      return result
    } catch (e3) {
      lastError = e3
    }
  }

  throw new Error('Namaz vakti alinamadi: ' + formatError(lastError))
}

async function buildPrayerPayload() {
  const country = readSettingValue('country', DEFAULT_COUNTRY)
  const city = readSettingValue('city', DEFAULT_CITY)
  const language = readSettingValue('language', DEFAULT_LANGUAGE)

  setDebugStage('build:' + city + ',' + country)
  const payload = await fetchResilientPrayerTimes(country, city)
  payload.language = language

  writeSettingValue('prayer_payload', JSON.stringify(payload))
  writeSettingValue('last_sync_status', 'ok')
  writeSettingValue('last_sync_error', '')
  writeSettingValue('last_payload_city', city)
  writeSettingValue('last_payload_country', country)
  writeSettingValue('last_payload_days', String(payload.daysCount || 1))

  return payload
}

async function pushLatestPrayerPayload() {
  if (isSyncing) {
    return
  }

  isSyncing = true
  try {
    setDebugStage('push:start')
    const payload = await buildPrayerPayload()
    await messageBuilder.call({
      method: 'PRAYER_TIMES_UPDATED',
      result: payload
    })
    setDebugStage('push:ok')
  } catch (error) {
    writeSettingValue('last_sync_status', 'error')
    writeSettingValue('last_sync_error', formatError(error))
    setDebugStage('push:error')
    messageBuilder.call({
      method: 'PRAYER_TIMES_ERROR',
      error: formatError(error)
    })
  } finally {
    isSyncing = false
  }
}

function scheduleDebouncedSync() {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer)
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    pushLatestPrayerPayload()
  }, 400)
}

AppSideService({
  onInit() {
    setDebugStage('init:start')
    messageBuilder.listen(() => {})
    setDebugStage('init:listen')

    settings.settingsStorage.addListener('change', (event) => {
      const key = event && event.key
      if (!key || key === 'country' || key === 'city' || key === 'language' || key === 'refresh_request') {
        scheduleDebouncedSync()
      }
    })

    messageBuilder.on('request', async (ctx) => {
      setDebugStage('request:received')
      const payload = messageBuilder.buf2Json(ctx.request.payload)
      writeSettingValue('last_request_method', payload.method || '')

      if (payload.method === 'GET_PRAYER_TIMES') {
        try {
          setDebugStage('request:get')
          const result = await buildPrayerPayload()
          ctx.response({
            data: { result }
          })
          setDebugStage('request:get:ok')
        } catch (error) {
          writeSettingValue('last_sync_status', 'error')
          writeSettingValue('last_sync_error', formatError(error))
          setDebugStage('request:get:error')
          ctx.response({
            data: {
              error: formatError(error),
              result: null
            }
          })
        }
      } else if (payload.method === 'SAVE_LOCATION') {
        const params = payload.params || {}
        setDebugStage('request:save')

        if (params.country) {
          writeSettingValue('country', String(params.country))
        }
        if (params.city) {
          writeSettingValue('city', String(params.city))
        }
        if (params.language) {
          writeSettingValue('language', String(params.language))
        }

        try {
          const result = await buildPrayerPayload()
          ctx.response({
            data: { result }
          })
          await messageBuilder.call({
            method: 'PRAYER_TIMES_UPDATED',
            result
          })
          setDebugStage('request:save:ok')
        } catch (error) {
          writeSettingValue('last_sync_status', 'error')
          writeSettingValue('last_sync_error', formatError(error))
          setDebugStage('request:save:error')
          ctx.response({
            data: {
              error: formatError(error),
              result: null
            }
          })
        }
      }
    })
  },

  onRun() {
    setDebugStage('run:start')
    scheduleDebouncedSync()
  },

  onDestroy() {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
      syncDebounceTimer = null
    }
  }
})
