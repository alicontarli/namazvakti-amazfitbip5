function readValue(storage, key, fallbackValue) {
  const value = storage.getItem(key)
  return value === null || value === undefined || value === '' ? fallbackValue : value
}

AppSettingsPage({
  build(props) {
    const storage = props.settingsStorage
    const country = readValue(storage, 'country', 'Turkey')
    const city = readValue(storage, 'city', 'Istanbul')
    const syncStatus = readValue(storage, 'last_sync_status', '-')
    const syncStage = readValue(storage, 'debug_stage', '-')
    const syncLocation =
      readValue(storage, 'last_payload_city', '-') +
      ', ' +
      readValue(storage, 'last_payload_country', '-')
    const syncError = readValue(storage, 'last_sync_error', '-')

    return View(
      {
        style: {
          padding: '16px 18px 24px',
          backgroundColor: '#eef4fb'
        }
      },
      [
        View(
          {
            style: {
              padding: '14px',
              borderRadius: '18px',
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
          label: 'Kaydet ve Yenile',
          style: {
            fontSize: '15px',
            borderRadius: '22px',
            background: '#0f7b6c',
            color: 'white',
            marginBottom: '10px'
          },
          onClick: () => {
            storage.setItem('refresh_request', String(Date.now()))
          }
        }),
        Button({
          label: 'Istanbul Varsayilan',
          style: {
            fontSize: '14px',
            borderRadius: '22px',
            background: '#2b69a6',
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
              padding: '14px',
              borderRadius: '18px',
              backgroundColor: '#ffffff'
            }
          },
          [
            TextInput({
              label: 'Senkron',
              value: syncStatus === 'ok' ? 'Bagli ve guncel' : syncStatus,
              disabled: true
            }),
            TextInput({
              label: 'Konum',
              value: syncLocation,
              disabled: true
            }),
            TextInput({
              label: 'Asama',
              value: syncStage,
              disabled: true
            }),
            TextInput({
              label: 'Hata',
              value: syncError === '-' ? 'Yok' : syncError,
              disabled: true
            })
          ]
        )
      ]
    )
  }
})
