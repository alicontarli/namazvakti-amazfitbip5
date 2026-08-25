import {
  createWidget,
  widget,
  prop,
  align,
  text_style,
  setAppWidgetSize
} from '@zos/ui'
import { localStorage } from '@zos/storage'
import {
  CACHE_KEY,
  FALLBACK_SCHEDULE,
  normalizePayload,
  mergePayloads,
  getNextPrayer,
  getMinuteBadge,
  formatCompactCountdown
} from '../shared/prayer-utils'
import { getTranslation } from '../shared/i18n'

AppWidget({
  state: {
    payload: FALLBACK_SCHEDULE,
    messageBuilder: null,
    titleWidget: null,
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
    const lang = this.state.payload.language || 'en'
    const t = getTranslation(lang)

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

    this.state.titleWidget = createWidget(widget.TEXT, {
      x: 28,
      y: 22,
      w: 180,
      h: 16,
      color: 0x8edcff,
      text_size: 12,
      text: t.appName,
      text_style: text_style.ELLIPSIS
    })

    this.state.labelWidget = createWidget(widget.TEXT, {
      x: 28,
      y: 42,
      w: 140,
      h: 16,
      color: 0xbdeaff,
      text_size: 12,
      text: t.next,
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
    const updated = mergePayloads(this.state.payload, rawPayload)
    this.state.payload = updated
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
    this.renderData()
  },

  renderData() {
    const payload = this.state.payload
    const lang = payload.language || 'en'
    const t = getTranslation(lang)

    const nowMs = Date.now()
    const nextPrayer = getNextPrayer(payload, nowMs)

    this.state.titleWidget &&
      this.state.titleWidget.setProperty(prop.TEXT, t.appName)

    this.state.labelWidget &&
      this.state.labelWidget.setProperty(prop.TEXT, t.next)

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
