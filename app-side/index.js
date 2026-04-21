import { MessageBuilder } from '../shared/message-side'

const DEFAULT_COUNTRY = 'Turkey'
const DEFAULT_CITY = 'Istanbul'
const messageBuilder = new MessageBuilder()
const API_URLS = [
  'https://api.aladhan.com/v1/timingsByCity/',
  'http://api.aladhan.com/v1/timingsByCity/'
]

function unwrapSettingValue(value, fallbackValue) {
  if (value === null || value === undefined || value === '') {
    return fallbackValue
  }

  if (typeof value !== 'string') {
    return String(value)
  }

  try {
    const parsed = JSON.parse(value)

    if (typeof parsed === 'string') {
      return parsed
    }

    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.value === 'string') {
        return parsed.value
      }
      if (typeof parsed.name === 'string') {
        return parsed.name
      }
    }
  } catch (error) {}

  return value
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

function buildApiUrl(baseUrl, country, city) {
  const datePath = getTodayApiDate()
  return (
    baseUrl +
    datePath +
    '?city=' +
    encodeURIComponent(city) +
    '&country=' +
    encodeURIComponent(country) +
    '&method=13'
  )
}

function formatError(error) {
  const message = error && error.message ? error.message : String(error || 'unknown error')
  return message.length > 120 ? message.slice(0, 117) + '...' : message
}

async function fetchPrayerTimes(country, city) {
  let lastError = null

  for (let i = 0; i < API_URLS.length; i += 1) {
    try {
      setDebugStage('fetch:' + API_URLS[i].replace('://', ':'))
      const response = await fetch({
        url: buildApiUrl(API_URLS[i], country, city),
        method: 'GET'
      })

      const json = typeof response.body === 'string' ? JSON.parse(response.body) : response.body

      if (!json || Number(json.code) !== 200 || !json.data || !json.data.timings) {
        throw new Error('API beklenen namaz vakti verisini donmedi')
      }

      setDebugStage('fetch:ok')

      return {
        city,
        country,
        date: json.data.date && json.data.date.gregorian ? json.data.date.gregorian.date : '',
        source: 'side-service',
        timings: {
          Fajr: normalizeApiTime(json.data.timings.Fajr),
          Dhuhr: normalizeApiTime(json.data.timings.Dhuhr),
          Asr: normalizeApiTime(json.data.timings.Asr),
          Maghrib: normalizeApiTime(json.data.timings.Maghrib),
          Isha: normalizeApiTime(json.data.timings.Isha)
        }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw new Error('Namaz vakti alinamadi: ' + formatError(lastError))
}

async function buildPrayerPayload() {
  const country = readSettingValue('country', DEFAULT_COUNTRY)
  const city = readSettingValue('city', DEFAULT_CITY)
  setDebugStage('build:' + city + ',' + country)
  const payload = await fetchPrayerTimes(country, city)

  writeSettingValue('prayer_payload', JSON.stringify(payload))
  writeSettingValue('last_sync_status', 'ok')
  writeSettingValue('last_sync_error', '')
  writeSettingValue('last_payload_city', city)
  writeSettingValue('last_payload_country', country)

  return payload
}

async function pushLatestPrayerPayload() {
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
  }
}

AppSideService({
  onInit() {
    setDebugStage('init:start')
    messageBuilder.listen(() => {})
    setDebugStage('init:listen')

    settings.settingsStorage.addListener('change', ({ key }) => {
      if (key === 'country' || key === 'city' || key === 'refresh_request') {
        setDebugStage('settings:' + key)
        pushLatestPrayerPayload()
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
    pushLatestPrayerPayload()
  },

  onDestroy() {}
})
