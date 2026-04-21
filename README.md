# Namaz Vakti

A Zepp OS mini app for the Amazfit Bip 5 that shows daily prayer times and a live countdown to the next prayer.

This project was built for:

- Device: `Amazfit Bip 5`
- Zepp OS: `2.1`
- Language: `JavaScript (ES2015)`

## Features

- Displays the 5 daily prayer times:
  - Fajr
  - Dhuhr
  - Asr
  - Maghrib
  - Isha
- Shows a live countdown to the next prayer
- Includes a phone-side settings page for country and city
- Fetches live prayer times from the Aladhan API through the app-side service
- Syncs updated data from phone to watch

## Architecture

The app uses the standard Zepp OS split architecture:

1. `setting/`
   Phone-side settings UI where the user enters country and city.
2. `app-side/`
   Phone-side background service that fetches prayer times from the API and sends them to the watch.
3. `page/`
   Watch UI that renders prayer times and the countdown.
4. `shared/`
   Shared message bridge used for watch <-> phone communication.

## Project Structure

```text
app.js
app.json
app-side/
page/
setting/
shared/
assets/
```

## Requirements

- Node.js
- Zeus CLI
- Zepp app on your phone
- An Amazfit Bip 5 watch for real-device testing

## Getting Started

Install Zeus CLI if needed:

```bash
npm install -g @zeppos/zeus-cli
```

Open the project:

```bash
cd namazvakti-clean
```

Build the app:

```bash
zeus build -t 320x380-amazfit-bip-5
```

Generate a QR code for real-device preview:

```bash
zeus preview
```

Then scan the QR code with the Zepp app and install the app on your watch.

## How It Works

- The watch page requests prayer times using the shared message bridge.
- The phone-side app service receives the request.
- The service fetches data from the Aladhan API.
- The result is cached and sent back to the watch.
- The watch updates the UI and keeps the countdown running locally.

## API

Prayer times are fetched from:

- `https://api.aladhan.com`

The app currently uses the date-based `timingsByCity` endpoint to avoid redirect issues on Zepp-side fetch calls.

## Current Status

Working:

- Live prayer times
- Next prayer countdown
- Country/city settings
- Watch and phone synchronization

Still open for future polish:

- Better visual refinement for the settings screen
- Additional UX cleanup
- Optional notifications / reminders

## Notes

- This project targets Bip 5 screen dimensions (`320x380`) specifically.
- Real-device testing was more reliable than emulator testing during development.
- Some UI choices are currently optimized for stability on Zepp OS rather than maximum visual polish.


