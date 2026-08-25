import { COUNTRIES, CITIES_BY_COUNTRY, TURKEY_81_CITIES } from '../shared/locations'
import { LANGUAGES } from '../shared/i18n'

function unwrapVal(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value)) {
    return value.length > 0 ? unwrapVal(value[0], fallback) : fallback
  }
  if (typeof value === 'object' && value !== null) {
    return value.value || value.name || fallback
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && (typeof parsed === 'object' || Array.isArray(parsed))) {
        return unwrapVal(parsed, fallback)
      }
      if (typeof parsed === 'string') return parsed
    } catch (e) {}
    return value
  }
  return String(value)
}

AppSettingsPage({
  build(props) {
    const storage = props.settingsStorage

    const rawCountry = storage.getItem('country')
    const rawCity = storage.getItem('city')
    const rawLanguage = storage.getItem('language')

    const language = unwrapVal(rawLanguage, 'tr')
    const country = unwrapVal(rawCountry, 'Turkey')
    const city = unwrapVal(rawCity, 'Istanbul')

    const syncStatus = unwrapVal(storage.getItem('last_sync_status'), '-')
    const syncStage = unwrapVal(storage.getItem('debug_stage'), '-')
    const syncDays = unwrapVal(storage.getItem('last_payload_days'), '-')
    const lastCity = unwrapVal(storage.getItem('last_payload_city'), '-')
    const lastCountry = unwrapVal(storage.getItem('last_payload_country'), '-')
    const syncError = unwrapVal(storage.getItem('last_sync_error'), '-')

    const syncLocation = lastCity !== '-' ? `${lastCity}, ${lastCountry}` : `${city}, ${country}`
    const syncStatusText = syncStatus === 'ok'
      ? (syncDays !== '-' ? `Up to date (${syncDays}-day calendar)` : 'Connected & up to date')
      : (syncStatus === '-' ? 'Ready' : syncStatus)

    const availableCities = CITIES_BY_COUNTRY[country] || TURKEY_81_CITIES

    return View(
      {
        style: {
          padding: '16px 16px 36px',
          backgroundColor: '#f1f5f9'
        }
      },
      [
        // CARD 1: Location & Language
        View(
          {
            style: {
              padding: '16px',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }
          },
          [
            View(
              {
                style: {
                  marginBottom: '14px'
                }
              },
              [
                Select({
                  label: 'Language',
                  options: LANGUAGES,
                  value: language,
                  onChange: (val) => {
                    const selectedLang = unwrapVal(val, 'tr')
                    storage.setItem('language', selectedLang)
                    storage.setItem('refresh_request', String(Date.now()))
                  }
                })
              ]
            ),
            View(
              {
                style: {
                  marginBottom: '14px'
                }
              },
              [
                Select({
                  label: 'Country',
                  options: COUNTRIES,
                  value: country,
                  onChange: (val) => {
                    const selectedCountry = unwrapVal(val, 'Turkey')
                    storage.setItem('country', selectedCountry)
                    const nextCities = CITIES_BY_COUNTRY[selectedCountry] || TURKEY_81_CITIES
                    storage.setItem('city', nextCities[0].value)
                    storage.setItem('refresh_request', String(Date.now()))
                  }
                })
              ]
            ),
            View(
              {
                style: {}
              },
              [
                Select({
                  label: 'City',
                  options: availableCities,
                  value: city,
                  onChange: (val) => {
                    const selectedCity = unwrapVal(val, 'Istanbul')
                    storage.setItem('city', selectedCity)
                    storage.setItem('refresh_request', String(Date.now()))
                  }
                })
              ]
            )
          ]
        ),

        // CARD 2: Sync Button
        View(
          {
            style: {
              marginBottom: '16px'
            }
          },
          [
            Button({
              label: 'Download Schedule & Sync to Watch',
              style: {
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '24px',
                background: '#0d9488',
                color: '#ffffff',
                height: '48px'
              },
              onClick: () => {
                storage.setItem('refresh_request', String(Date.now()))
              }
            })
          ]
        ),

        // CARD 3: Synchronization Status
        View(
          {
            style: {
              padding: '16px',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }
          },
          [
            TextInput({
              label: 'Sync Status',
              value: syncStatusText,
              disabled: true
            }),
            TextInput({
              label: 'Synced Location',
              value: syncLocation,
              disabled: true
            }),
            TextInput({
              label: 'Stage / Connection',
              value: syncStage === '-' ? 'Ready' : syncStage,
              disabled: true
            }),
            TextInput({
              label: 'Error Log',
              value: syncError === '-' ? 'None' : syncError,
              disabled: true
            })
          ]
        ),

        // CARD 4: Set Default Button (Turkish - Turkey - Istanbul)
        Button({
          label: 'Set Default: Turkey / Istanbul (Turkish)',
          style: {
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '24px',
            background: '#2563eb',
            color: '#ffffff',
            height: '44px'
          },
          onClick: () => {
            storage.setItem('language', 'tr')
            storage.setItem('country', 'Turkey')
            storage.setItem('city', 'Istanbul')
            storage.setItem('refresh_request', String(Date.now()))
          }
        })
      ]
    )
  }
})
