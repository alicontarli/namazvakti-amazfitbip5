import {
  createWidget,
  widget,
  prop,
  align,
  text_style,
  setAppWidgetSize
} from '@zos/ui'
import { localStorage } from '@zos/storage'

const CACHE_KEY = 'prayer_times_cache'

const FALLBACK_PAYLOAD = {
  city: 'Istanbul',
  country: 'Turkey',
  source: 'fallback',
  date: '2026-04-28',
  timings: {
    Fajr: '04:35',
    Dhuhr: '13:08',
    Asr: '16:53',
    Maghrib: '19:57',
    Isha: '21:25'
  }
}

const PRAYER_ROWS = [
  { key: 'Fajr', label: 'Sabah' },
  { key: 'Dhuhr', label: 'Ogle' },
  { key: 'Asr', label: 'Ikindi' },
  { key: 'Maghrib', label: 'Aksam' },
  { key: 'Isha', label: 'Yatsi' }
]

function sanitizeTimeText(value) {
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

function normalizePayload(rawValue) {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : null
    const source = parsed && parsed.timings ? parsed : FALLBACK_PAYLOAD

    return {
      city: source.city || FALLBACK_PAYLOAD.city,
      country: source.country || FALLBACK_PAYLOAD.country,
      source: source.source || 'cache',
      date: source.date || '',
      timings: {
        Fajr: sanitizeTimeText(source.timings && source.timings.Fajr),
        Dhuhr: sanitizeTimeText(source.timings && source.timings.Dhuhr),
        Asr: sanitizeTimeText(source.timings && source.timings.Asr),
        Maghrib: sanitizeTimeText(source.timings && source.timings.Maghrib),
        Isha: sanitizeTimeText(source.timings && source.timings.Isha)
      }
    }
  } catch (error) {
    return FALLBACK_PAYLOAD
  }
}

function buildPrayerTimestamp(timeText, addDay) {
  const now = new Date()
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

function getNextPrayer(payload, nowMs) {
  for (let i = 0; i < PRAYER_ROWS.length; i += 1) {
    const row = PRAYER_ROWS[i]
    const prayerTime = buildPrayerTimestamp(payload.timings[row.key], 0)

    if (prayerTime > nowMs) {
      return {
        label: row.label,
        time: payload.timings[row.key],
        diffMs: prayerTime - nowMs
      }
    }
  }

  return {
    label: 'Sabah',
    time: payload.timings.Fajr,
    diffMs: buildPrayerTimestamp(payload.timings.Fajr, 1) - nowMs
  }
}

function getPreviousPrayer(payload, nowMs) {
  let previous = null

  for (let i = 0; i < PRAYER_ROWS.length; i += 1) {
    const row = PRAYER_ROWS[i]
    const prayerTime = buildPrayerTimestamp(payload.timings[row.key], 0)

    if (prayerTime <= nowMs) {
      previous = {
        label: row.label,
        timeMs: prayerTime
      }
    }
  }

  if (previous) {
    return previous
  }

  return {
    label: 'Yatsi',
    timeMs: buildPrayerTimestamp(payload.timings.Isha, -1)
  }
}

function formatCompactCountdown(diffMs) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
}

function getMinuteBadge(payload, nextPrayer, nowMs) {
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

AppWidget({
  state: {
    payload: FALLBACK_PAYLOAD,
    messageBuilder: null,
    labelWidget: null,
    prayerWidget: null,
    timeWidget: null,
    badgeWidget: null,
    footerWidget: null,
    callHandler: null
  },

  onInit() {
    setAppWidgetSize({
      h: 112
    })

    const app = getApp()
    this.state.messageBuilder =
      (app && app.globalData && app.globalData.messageBuilder) ||
      (app && app._options && app._options.globalData
        ? app._options.globalData.messageBuilder
        : null)

    const cachedPayload = localStorage.getItem(CACHE_KEY)
    this.state.payload = normalizePayload(cachedPayload)
    this.bindMessaging()
  },

  build() {
    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 320,
      h: 112,
      radius: 24,
      color: 0x0d1d32
    })

    createWidget(widget.FILL_RECT, {
      x: 14,
      y: 10,
      w: 292,
      h: 92,
      radius: 20,
      color: 0x123f6d
    })

    createWidget(widget.TEXT, {
      x: 28,
      y: 22,
      w: 180,
      h: 16,
      color: 0x8edcff,
      text_size: 12,
      text: 'Namaz Vakti',
      text_style: text_style.ELLIPSIS
    })

    this.state.labelWidget = createWidget(widget.TEXT, {
      x: 28,
      y: 42,
      w: 140,
      h: 16,
      color: 0xbdeaff,
      text_size: 12,
      text: 'Sonraki',
      text_style: text_style.ELLIPSIS
    })

    this.state.prayerWidget = createWidget(widget.TEXT, {
      x: 28,
      y: 58,
      w: 120,
      h: 24,
      color: 0xffffff,
      text_size: 22,
      text: '--',
      text_style: text_style.ELLIPSIS
    })

    this.state.timeWidget = createWidget(widget.TEXT, {
      x: 132,
      y: 60,
      w: 72,
      h: 22,
      color: 0xfff2cf,
      text_size: 19,
      align_h: align.CENTER_H,
      text: '--:--',
      text_style: text_style.ELLIPSIS
    })

    createWidget(widget.FILL_RECT, {
      x: 232,
      y: 26,
      w: 54,
      h: 54,
      radius: 27,
      color: 0x07111d
    })

    this.state.badgeWidget = createWidget(widget.TEXT, {
      x: 232,
      y: 39,
      w: 54,
      h: 28,
      color: 0x7be7ff,
      text_size: 22,
      align_h: align.CENTER_H,
      text: '--',
      text_style: text_style.ELLIPSIS
    })

    this.state.footerWidget = createWidget(widget.TEXT, {
      x: 28,
      y: 86,
      w: 180,
      h: 14,
      color: 0x9db8d6,
      text_size: 11,
      text: '',
      text_style: text_style.ELLIPSIS
    })

    this.renderData()
  },

  onResume() {
    this.refreshFromCache()
    this.requestPrayerTimes()
  },

  onDestroy() {
    if (this.state.messageBuilder && this.state.callHandler) {
      this.state.messageBuilder.off('call', this.state.callHandler)
      this.state.callHandler = null
    }
  },

  bindMessaging() {
    if (!this.state.messageBuilder) {
      return
    }

    this.state.callHandler = ({ payload }) => {
      const data = this.state.messageBuilder.buf2Json(payload)

      if (data.method === 'PRAYER_TIMES_UPDATED' && data.result) {
        this.applyPayload(data.result)
      }
    }

    this.state.messageBuilder.on('call', this.state.callHandler)
  },

  refreshFromCache() {
    const cachedPayload = localStorage.getItem(CACHE_KEY)
    this.state.payload = normalizePayload(cachedPayload)
    this.renderData()
  },

  requestPrayerTimes() {
    if (!this.state.messageBuilder) {
      return
    }

    this.state.messageBuilder.request({
      method: 'GET_PRAYER_TIMES'
    })
      .then((data) => {
        if (data && data.result) {
          this.applyPayload(data.result)
        }
      })
      .catch(() => {})
  },

  applyPayload(rawPayload) {
    const payload = normalizePayload(JSON.stringify(rawPayload))
    this.state.payload = payload
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    this.renderData()
  },

  renderData() {
    const payload = this.state.payload
    const nowMs = Date.now()
    const nextPrayer = getNextPrayer(payload, nowMs)

    this.state.prayerWidget &&
      this.state.prayerWidget.setProperty(
        prop.TEXT,
        nextPrayer.label
      )

    this.state.timeWidget &&
      this.state.timeWidget.setProperty(
        prop.TEXT,
        nextPrayer.time
      )

    this.state.badgeWidget &&
      this.state.badgeWidget.setProperty(
        prop.TEXT,
        getMinuteBadge(payload, nextPrayer, nowMs)
      )

    this.state.footerWidget &&
      this.state.footerWidget.setProperty(
        prop.TEXT,
        payload.city + ' / ' + formatCompactCountdown(nextPrayer.diffMs)
      )
  }
})
