import hmUI from '@zos/ui'
import { Time } from '@zos/sensor'
import { localStorage } from '@zos/storage'

const SCREEN_WIDTH = 320
const SCREEN_HEIGHT = 380
const CACHE_KEY = 'prayer_times_cache'

const FALLBACK_PAYLOAD = {
  city: 'Istanbul',
  country: 'Turkey',
  source: 'fallback',
  date: '2026-04-21',
  timings: {
    Fajr: '04:52',
    Dhuhr: '13:07',
    Asr: '16:46',
    Maghrib: '19:42',
    Isha: '21:12'
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
        diffMs: prayerTime - nowMs
      }
    }
  }

  return {
    label: 'Sabah',
    diffMs: buildPrayerTimestamp(payload.timings.Fajr, 1) - nowMs
  }
}

function formatCountdown(diffMs) {
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

Page({
  state: {
    timerId: null,
    payload: FALLBACK_PAYLOAD,
    statusText: 'Demo veri',
    messageBuilder: null,
    callHandler: null,
    nextPrayerWidget: null,
    countdownWidget: null,
    cityWidget: null,
    statusWidget: null,
    rowWidgets: {}
  },

  onInit() {
    const app = getApp()
    this.state.messageBuilder =
      (app && app.globalData && app.globalData.messageBuilder) ||
      (app && app._options && app._options.globalData
        ? app._options.globalData.messageBuilder
        : null)

    const cachedPayload = localStorage.getItem(CACHE_KEY)
    this.state.payload = normalizePayload(cachedPayload)
    this.state.statusText = this.state.payload.source === 'side-service'
      ? this.state.payload.date || 'Canli veri'
      : this.state.messageBuilder
        ? 'Demo veri'
        : 'Mesaj koprusu yok'
  },

  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: SCREEN_WIDTH,
      h: SCREEN_HEIGHT,
      color: 0x08111d
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 18,
      y: 62,
      w: 284,
      h: 86,
      radius: 24,
      color: 0x143a63
    })

    this.state.nextPrayerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 32,
      y: 80,
      w: 256,
      h: 22,
      color: 0xd7f7ff,
      text_size: 18,
      text: 'Sonraki: --',
      align_h: hmUI.align.CENTER_H
    })

    this.state.countdownWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 32,
      y: 104,
      w: 256,
      h: 30,
      color: 0xfff1ba,
      text_size: 28,
      text: '--:--:--',
      align_h: hmUI.align.CENTER_H
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 18,
      y: 160,
      w: 284,
      h: 166,
      radius: 24,
      color: 0x0d2039
    })

    this.state.cityWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 34,
      y: 168,
      w: 252,
      h: 16,
      color: 0x7ea6cf,
      text_size: 12,
      text: '',
      align_h: hmUI.align.CENTER_H
    })

    this.state.statusWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 34,
      y: 320,
      w: 252,
      h: 14,
      color: 0x6e8fb4,
      text_size: 11,
      text: '',
      align_h: hmUI.align.CENTER_H
    })

    for (let i = 0; i < PRAYER_ROWS.length; i += 1) {
      const row = PRAYER_ROWS[i]
      const top = 190 + i * 26

      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 28,
        y: top,
        w: 264,
        h: 20,
        radius: 14,
        color: i === 0 ? 0x18436f : i % 2 === 0 ? 0x133353 : 0x102b46
      })

      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 36,
        y: top + 1,
        w: 110,
        h: 18,
        color: 0xffffff,
        text_size: 16,
        text: row.label
      })

      this.state.rowWidgets[row.key] = hmUI.createWidget(hmUI.widget.TEXT, {
        x: 182,
        y: top + 1,
        w: 98,
        h: 18,
        color: 0xb7ffd2,
        text_size: 17,
        text: '--:--',
        align_h: hmUI.align.RIGHT
      })
    }

    this.renderData()
    this.bindMessaging()
    this.requestPrayerTimes()

    this.state.timerId = setInterval(() => {
      this.renderData()
    }, 1000)
  },

  bindMessaging() {
    if (!this.state.messageBuilder) {
      return
    }

    this.state.callHandler = ({ payload }) => {
      const data = this.state.messageBuilder.buf2Json(payload)

      if (data.method === 'PRAYER_TIMES_UPDATED' && data.result) {
        this.applyPayload(data.result)
      } else if (data.method === 'PRAYER_TIMES_ERROR' && data.error) {
        this.state.statusText = data.error
        this.renderData()
      }
    }

    this.state.messageBuilder.on('call', this.state.callHandler)
  },

  requestPrayerTimes() {
    if (!this.state.messageBuilder) {
      this.state.statusText = 'Mesaj koprusu yok'
      this.renderData()
      return
    }

    this.state.messageBuilder.request({
      method: 'GET_PRAYER_TIMES'
    })
      .then((data) => {
        if (data && data.result) {
          this.applyPayload(data.result)
        } else {
          this.state.statusText = data && data.error ? data.error : 'Demo veri'
          this.renderData()
        }
      })
      .catch((error) => {
        this.state.statusText = String(error || 'Baglanti kurulamadi')
        this.renderData()
      })
  },

  applyPayload(rawPayload) {
    const payload = normalizePayload(JSON.stringify(rawPayload))
    this.state.payload = payload
    this.state.statusText = payload.date || 'Canli veri'
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    this.renderData()
  },

  renderData() {
    const payload = this.state.payload
    const nowMs = new Time().getTime()
    const nextPrayer = getNextPrayer(payload, nowMs)

    this.state.nextPrayerWidget.setProperty(
      hmUI.prop.TEXT,
      'Sonraki: ' + nextPrayer.label
    )
    this.state.countdownWidget.setProperty(
      hmUI.prop.TEXT,
      formatCountdown(nextPrayer.diffMs)
    )
    this.state.cityWidget.setProperty(
      hmUI.prop.TEXT,
      payload.city + ', ' + payload.country
    )
    this.state.statusWidget.setProperty(
      hmUI.prop.TEXT,
      this.state.statusText || 'Demo veri'
    )

    for (let i = 0; i < PRAYER_ROWS.length; i += 1) {
      const row = PRAYER_ROWS[i]
      this.state.rowWidgets[row.key].setProperty(
        hmUI.prop.TEXT,
        payload.timings[row.key]
      )
    }
  },

  onDestroy() {
    if (this.state.timerId) {
      clearInterval(this.state.timerId)
      this.state.timerId = null
    }

    if (this.state.messageBuilder && this.state.callHandler) {
      this.state.messageBuilder.off('call', this.state.callHandler)
      this.state.callHandler = null
    }
  }
})
