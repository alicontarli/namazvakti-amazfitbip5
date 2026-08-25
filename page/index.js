import hmUI from '@zos/ui'
import { Time } from '@zos/sensor'
import { localStorage } from '@zos/storage'
import {
  CACHE_KEY,
  PRAYER_KEYS,
  getPrayerRows,
  FALLBACK_SCHEDULE,
  normalizePayload,
  mergePayloads,
  getNextPrayer,
  formatCountdown,
  getScheduleValidity
} from '../shared/prayer-utils'
import { getTranslation } from '../shared/i18n'

const SCREEN_WIDTH = 320
const SCREEN_HEIGHT = 380

Page({
  state: {
    timerId: null,
    payload: FALLBACK_SCHEDULE,
    messageBuilder: null,
    callHandler: null,
    nextPrayerWidget: null,
    countdownWidget: null,
    cityWidget: null,
    statusWidget: null,
    rowWidgets: {},
    rowLabelWidgets: {},
    lastPrayerKey: '',
    lastLanguage: ''
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
  },

  build() {
    const lang = this.state.payload.language || 'tr'
    const rows = getPrayerRows(lang)

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: SCREEN_WIDTH,
      h: SCREEN_HEIGHT,
      color: 0x07111d
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 20,
      y: 82,
      w: 280,
      h: 78,
      radius: 24,
      color: 0x123f6d
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 122,
      y: 95,
      w: 76,
      h: 4,
      radius: 2,
      color: 0x7be7ff
    })

    this.state.nextPrayerWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 40,
      y: 106,
      w: 240,
      h: 20,
      color: 0xeafcff,
      text_size: 16,
      text: '--: --',
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })

    this.state.countdownWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 36,
      y: 126,
      w: 248,
      h: 28,
      color: 0xfff2cf,
      text_size: 26,
      text: '--:--:--',
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })

    this.state.cityWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 40,
      y: 171,
      w: 240,
      h: 16,
      color: 0x9db8d6,
      text_size: 12,
      text: '',
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 20,
      y: 194,
      w: 280,
      h: 140,
      radius: 24,
      color: 0x0d1d32
    })

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const top = 206 + i * 24

      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 34,
        y: top,
        w: 252,
        h: 18,
        radius: 9,
        color: i === 0 ? 0x183f69 : i % 2 === 0 ? 0x112d4b : 0x0f2741
      })

      this.state.rowLabelWidgets[row.key] = hmUI.createWidget(hmUI.widget.TEXT, {
        x: 56,
        y: top - 1,
        w: 104,
        h: 20,
        color: 0xffffff,
        text_size: 14,
        text: row.label,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS
      })

      this.state.rowWidgets[row.key] = hmUI.createWidget(hmUI.widget.TEXT, {
        x: 190,
        y: top - 1,
        w: 78,
        h: 20,
        color: 0xdfffd9,
        text_size: 16,
        text: '--:--',
        align_h: hmUI.align.RIGHT,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS
      })
    }

    this.state.statusWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 30,
      y: 318,
      w: 260,
      h: 16,
      color: 0x7c98bc,
      text_size: 11,
      text: '',
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })

    this.renderData(true)
    this.bindMessaging()
    this.requestPrayerTimes()

    this.state.timerId = setInterval(() => {
      this.renderData(false)
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
      }
    }

    this.state.messageBuilder.on('call', this.state.callHandler)
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
    const updated = mergePayloads(this.state.payload, rawPayload)
    this.state.payload = updated
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
    this.renderData(true)
  },

  renderData(fullRefresh = false) {
    const payload = this.state.payload
    const lang = payload.language || 'en'
    const t = getTranslation(lang)
    const rows = getPrayerRows(lang)

    const nowMs = new Time().getTime()
    const nowDate = new Date(nowMs)
    const nextPrayer = getNextPrayer(payload, nowMs)

    this.state.nextPrayerWidget.setProperty(
      hmUI.prop.TEXT,
      `${t.next}: ${nextPrayer.label}`
    )
    this.state.countdownWidget.setProperty(
      hmUI.prop.TEXT,
      formatCountdown(nextPrayer.diffMs)
    )

    const languageChanged = this.state.lastLanguage !== lang
    if (fullRefresh || this.state.lastPrayerKey !== nextPrayer.key || languageChanged) {
      this.state.lastPrayerKey = nextPrayer.key
      this.state.lastLanguage = lang

      this.state.cityWidget.setProperty(
        hmUI.prop.TEXT,
        `${payload.city}, ${payload.country}`
      )

      const validity = getScheduleValidity(payload, nowDate)
      this.state.statusWidget.setProperty(
        hmUI.prop.TEXT,
        validity.statusText
      )
      this.state.statusWidget.setProperty(
        hmUI.prop.COLOR,
        validity.isWarning ? 0xffaa33 : 0x7c98bc
      )

      const timings = nextPrayer.todayTimings
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]
        if (this.state.rowLabelWidgets[row.key]) {
          this.state.rowLabelWidgets[row.key].setProperty(
            hmUI.prop.TEXT,
            row.label
          )
        }
        if (this.state.rowWidgets[row.key]) {
          this.state.rowWidgets[row.key].setProperty(
            hmUI.prop.TEXT,
            timings[row.key] || '--:--'
          )
        }
      }
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
