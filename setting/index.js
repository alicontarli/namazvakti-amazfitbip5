function readValue(storage, key, fallbackValue) {
  const value = storage.getItem(key)
  return value === null || value === undefined || value === '' ? fallbackValue : value
}

AppSettingsPage({
  build(props) {
    const storage = props.settingsStorage

    const country = readValue(storage, 'country', 'Turkey')
    const city = readValue(storage, 'city', 'Istanbul')
    const debugStatus = readValue(storage, 'last_sync_status', '-')
    const debugStage = readValue(storage, 'debug_stage', '-')
    const debugRequest = readValue(storage, 'last_request_method', '-')
    const debugLocation =
      readValue(storage, 'last_payload_city', '-') +
      ', ' +
      readValue(storage, 'last_payload_country', '-')
    const debugError = readValue(storage, 'last_sync_error', '-')

    return View(
      {
        style: {
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f7fb'
        }
      },
      [
        View(
          {
            style: {
              marginBottom: '14px',
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff'
            }
          },
          [
            Text({
              value: 'Namaz Vakti Ayarlari',
              style: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#10233a',
                marginBottom: '6px'
              }
            }),
            Text({
              value: 'Ulke ve sehir bilgisini gir. Kaydedince telefon veriyi cekip saate gonderecek.',
              style: {
                fontSize: '13px',
                color: '#4a6078',
                lineHeight: '18px'
              }
            })
          ]
        ),
        View(
          {
            style: {
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              marginBottom: '12px'
            }
          },
          [
            TextInput({
              label: 'Ulke',
              value: country,
              placeholder: 'Turkey',
              settingsKey: 'country'
            }),
            TextInput({
              label: 'Sehir',
              value: city,
              placeholder: 'Istanbul',
              settingsKey: 'city'
            })
          ]
        ),
        Button({
          label: 'Uygula / Yenile',
          style: {
            fontSize: '14px',
            borderRadius: '24px',
            background: '#0f7b6c',
            color: 'white',
            marginBottom: '10px'
          },
          onClick: () => {
            storage.setItem('refresh_request', String(Date.now()))
          }
        }),
        Button({
          label: 'Varsayilan Konum',
          style: {
            fontSize: '14px',
            borderRadius: '24px',
            background: '#195a94',
            color: 'white',
            marginBottom: '12px'
          },
          onClick: () => {
            storage.setItem('country', 'Turkey')
            storage.setItem('city', 'Istanbul')
            storage.setItem('refresh_request', String(Date.now()))
          }
        }),
        View(
          {
            style: {
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff'
            }
          },
          [
            Text({
              value: 'Debug',
              style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#10233a',
                marginBottom: '8px'
              }
            }),
            TextInput({
              label: 'Durum',
              value: debugStatus,
              disabled: true
            }),
            TextInput({
              label: 'Asama',
              value: debugStage,
              disabled: true
            }),
            TextInput({
              label: 'Istek',
              value: debugRequest,
              disabled: true
            }),
            TextInput({
              label: 'Son Konum',
              value: debugLocation,
              disabled: true
            }),
            TextInput({
              label: 'Hata',
              value: debugError,
              disabled: true
            })
          ]
        )
      ]
    )
  }
})
