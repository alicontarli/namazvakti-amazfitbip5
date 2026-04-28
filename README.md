# Namaz Vakti 

This project is currently in Beta.

`Namaz Vakti` is a Zepp OS mini app for the Amazfit Bip 5 that provides daily prayer times, a live countdown to the next prayer, and companion widget surfaces for quick access from the watch UI.

The project is built specifically for:

- Device: `Amazfit Bip 5`
- Zepp OS: `2.1`
- Language: `JavaScript (ES2015)`

## Overview

This repository contains a complete Zepp OS application with three production-facing layers:

- a phone-side settings screen for location input
- a phone-side background service that fetches live prayer times
- a watch-side application that renders the daily schedule and countdown

In addition, the project includes:

- a `Shortcut Card` surface (`app-widget`)
- a `Secondary Widget` surface for the widget area on supported watch firmware

## Features

- Daily prayer time display for:
  - Fajr
  - Dhuhr
  - Asr
  - Maghrib
  - Isha
- Live countdown to the next prayer
- Country and city configuration from the Zepp mobile app
- Live synchronization from phone to watch through the Zepp messaging bridge
- Local caching on the watch for resilient display after sync
- Shortcut Card support
- Secondary Widget support

## Architecture

The project follows the standard Zepp OS split architecture:

1. `setting/`
   Phone-side settings UI used to store country and city.
2. `app-side/`
   Phone-side background service responsible for fetching data from the API and responding to watch requests.
3. `page/`
   Main watch application screen.
4. `app-widget/`
   Shortcut Card implementation.
5. `secondary-widget/`
   Secondary Widget implementation for widget-capable surfaces.
6. `shared/`
   Shared messaging bridge used by the watch and phone-side service.

## Project Structure

```text
app.js
app.json
app-side/
app-widget/
page/
secondary-widget/
setting/
shared/
assets/
README.md
```

## Requirements

- Node.js
- Zeus CLI
- Zepp mobile app
- Amazfit Bip 5 for real-device testing

## Development

Install Zeus CLI if it is not already available:

```bash
npm install -g @zeppos/zeus-cli
```

Move into the project directory:

```bash
cd namazvakti-clean
```

Build the application:

```bash
zeus build -t 320x380-amazfit-bip-5
```

Generate a preview QR code for installation on a real watch:

```bash
zeus preview
```

## Runtime Flow

The runtime flow is intentionally simple and reliable:

1. The watch app requests prayer data through the shared message bridge.
2. The phone-side service receives the request.
3. The service fetches the current day prayer schedule from the Aladhan API.
4. The response is cached and sent back to the watch.
5. The main app, Shortcut Card, and Secondary Widget read from the same shared cached payload.

## API

Prayer times are fetched from the Aladhan API:

- `https://api.aladhan.com`

The implementation uses the date-based `timingsByCity` endpoint. This was chosen deliberately because the non-dated endpoint currently redirects, and direct date-based requests are more reliable in Zepp-side fetch flows.

## Widget Support

The repository currently includes two widget-style surfaces:

- `app-widget`
  Exposed as a `Shortcut Card`
- `secondary-widget`
  Intended for the standard widget surface on supported device firmware

### Known Widget Note

There is still a known issue around the widget guide / widget presentation layer on some surfaces. In practice:

- the widgets are usable
- Shortcut Card support is working
- Secondary Widget support is implemented
- some widget presentation details may still require additional refinement depending on firmware behavior and Zepp-side widget handling

This is a polish issue, not a blocker for normal application use.

## Current Status

Implemented and working:

- main watch app
- live prayer time sync
- next prayer countdown
- location settings
- shared watch cache
- Shortcut Card
- Secondary Widget

Still open for future improvement:

- additional UI refinement for widgets
- settings screen polish
- optional reminder / notification features
- possible exploration of richer watchface-style integrations on newer API levels

## Notes

- The project targets the Bip 5 rectangular `320x380` layout specifically.
- Real-device testing proved significantly more reliable than emulator testing during development.
- Some Zepp OS surfaces behave differently depending on firmware and launcher/widget handling, so layout validation on the actual watch is strongly recommended.



No license file has been added yet. Choose and add a license before publishing the repository publicly.

