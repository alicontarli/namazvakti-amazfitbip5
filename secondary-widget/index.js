import {
  createWidget,
  widget,
  prop,
  align,
  text_style
} from '@zos/ui'
import { localStorage } from '@zos/storage'
import {
  CACHE_KEY,
  getPrayerRows,
  FALLBACK_SCHEDULE,
  normalizePayload,
  mergePayloads,
  getNextPrayer,
  getMinuteBadge,
  formatCountdown,
  getScheduleValidity
} from '../shared/prayer-utils'
import { getTranslation } from '../shared/i18n'

SecondaryWidget({
  state: {
    payload: FALLBACK_SCHEDULE,
    messageBuilder: null,
    titleWidget: null,
    nextLabelWidget: null,
    nextWidget: null,
    timeWidget: null,
    badgeWidget: null,
    cityWidget: null,
    footerWidget: null,
    rowWidgets: {},
    rowLabelWidgets: {},
    callHandler: null
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
    this.bindMessaging()
  },

  build() {
    const lang = this.state.payload.language || 'tr'
    const t = getTranslation(lang)
    const rows = getPrayerRows(lang)

    createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: 320,
      h: 380,
      color: 0x08111d
    })

    createWidget(widget.FILL_RECT, {
      x: 18,
      y: 20,
      w: 284,
      h: 104,
      radius: 24,
      color: 0x113f6c
    })

    this.state.titleWidget = createWidget(widget.TEXT, {
      x: 34,
      y: 34,
      w: 170,
      h: 16,
      color: 0x8edcff,
      text_size: 12,
      text: t.appName,
      text_style: text_style.ELLIPSIS
    })

    this.state.nextLabelWidget = createWidget(widget.TEXT, {
      x: 34,
      y: 54,
      w: 120,
      h: 16,
      color: 0xbdeaff,
      text_size: 12,
      text: t.next,
      text_style: text_style.ELLIPSIS
    })

    this.state.nextWidget = createWidget(widget.TEXT, {
      x: 34,
      y: 72,
      w: 118,
      h: 24,
      color: 0xffffff,
      text_size: 22,
      text: '--',
      text_style: text_style.ELLIPSIS
    })

    this.state.timeWidget = createWidget(widget.TEXT, {
      x: 136,
      y: 74,
      w: 76,
      h: 22,
      color: 0xfff2cf,
      text_size: 19,
      text: '--:--',
      align_h: align.CENTER_H,
      text_style: text_style.ELLIPSIS
    })

    createWidget(widget.FILL_RECT, {
      x: 230,
      y: 42,
      w: 54,
      h: 54,
      radius: 27,
      color: 0x07111d
    })

    this.state.badgeWidget = createWidget(widget.TEXT, {
      x: 230,
      y: 55,
      w: 54,
      h: 28,
      color: 0x7be7ff,
      text_size: 22,
      align_h: align.CENTER_H,
      text: '--',
      text_style: text_style.ELLIPSIS
    })

    this.state.cityWidget = createWidget(widget.TEXT, {
      x: 30,
      y: 134,
      w: 260,
      h: 16,
      color: 0x98b6d7,
      text_size: 12,
      text: '',
      align_h: align.CENTER_H,
      text_style: text_style.ELLIPSIS
    })

    createWidget(widget.FILL_RECT, {
      x: 18,
      y: 160,
      w: 284,
      h: 154,
      radius: 24,
      color: 0x0d1d32
    })

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const top = 174 + i * 26

      createWidget(widget.FILL_RECT, {
        x: 32,
        y: top,
        w: 256,
        h: 20,
        radius: 10,
        color: i === 0 ? 0x1b4f86 : i % 2 === 0 ? 0x14385d : 0x102d4a
      })

      this.state.rowLabelWidgets[row.key] = createWidget(widget.TEXT, {
        x: 48,
        y: top + 1,
        w: 110,
        h: 18,
        color: 0xffffff,
        text_size: 15,
        text: row.label,
        text_style: text_style.ELLIPSIS
      })

      this.state.rowWidgets[row.key] = createWidget(widget.TEXT, {
        x: 186,
        y: top + 1,
        w: 86,
        h: 18,
        color: 0xe4ffd9,
        text_size: 16,
        align_h: align.RIGHT,
        text: '--:--',
        text_style: text_style.ELLIPSIS
      })
    }

    this.state.footerWidget = createWidget(widget.TEXT, {
      x: 30,
      y: 322,
      w: 260,
      h: 16,
      color: 0x7f9cc1,
      text_size: 12,
      text: '',
      align_h: align.CENTER_H,
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
    const updated = mergePayloads(this.state.payload, rawPayload)
    this.state.payload = updated
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
    this.renderData()
  },

  renderData() {
    const payload = this.state.payload
    const lang = payload.language || 'en'
    const t = getTranslation(lang)
    const rows = getPrayerRows(lang)

    const nowMs = Date.now()
    const nowDate = new Date(nowMs)
    const nextPrayer = getNextPrayer(payload, nowMs)

    this.state.titleWidget &&
      this.state.titleWidget.setProperty(prop.TEXT, t.appName)

    this.state.nextLabelWidget &&
      this.state.nextLabelWidget.setProperty(prop.TEXT, t.next)

    this.state.nextWidget &&
      this.state.nextWidget.setProperty(prop.TEXT, nextPrayer.label)

    this.state.timeWidget &&
      this.state.timeWidget.setProperty(
        prop.TEXT,
        nextPrayer.time + ' / ' + formatCountdown(nextPrayer.diffMs)
      )

    this.state.badgeWidget &&
      this.state.badgeWidget.setProperty(
        prop.TEXT,
        getMinuteBadge(payload, nextPrayer, nowMs)
      )

    this.state.cityWidget &&
      this.state.cityWidget.setProperty(
        prop.TEXT,
        payload.city + ', ' + payload.country
      )

    const validity = getScheduleValidity(payload, nowDate)
    if (this.state.footerWidget) {
      this.state.footerWidget.setProperty(
        prop.TEXT,
        validity.statusText
      )
      this.state.footerWidget.setProperty(
        prop.COLOR,
        validity.isWarning ? 0xffaa33 : 0x7f9cc1
      )
    }

    const timings = nextPrayer.todayTimings
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      if (this.state.rowLabelWidgets[row.key]) {
        this.state.rowLabelWidgets[row.key].setProperty(
          prop.TEXT,
          row.label
        )
      }
      if (this.state.rowWidgets[row.key]) {
        this.state.rowWidgets[row.key].setProperty(
          prop.TEXT,
          timings[row.key] || '--:--'
        )
      }
    }
  }
})
