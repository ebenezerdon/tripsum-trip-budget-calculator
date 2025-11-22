# TripSum: Trip Budget Calculator

TripSum helps you plan travel costs by category, convert expenses across currencies, and keep a running total in your chosen base currency. It is built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems, and designed to feel polished and production-ready.

## Features
- Category-based budgeting: transport, lodging, food, activities, and custom categories
- Currency-aware entries with base currency selection
- Editable exchange rates anchored to USD, with optional one-click live updates
- Live totals by category and a grand total
- Add, edit, and delete items with notes and dates
- Quick-add shortcuts for common expenses
- Local persistence with browser localStorage
- Import and export data as JSON
- Responsive, accessible UI with smooth CSS animations

## Getting started
1. Download or clone this repository.
2. Open `index.html` in your browser to view the landing page.
3. Click "Launch Calculator" to open `app.html` and start planning your trip.

No build step is required. Everything runs client-side.

## Tech stack
- HTML5 + Tailwind CSS (via CDN)
- jQuery 3.7.x for DOM and events
- Modular JavaScript in `scripts/` with a single global namespace `window.App`

## File structure
- `index.html` — Landing page
- `app.html` — Main application
- `styles/main.css` — Global styles and animations
- `scripts/helpers.js` — Utilities, storage, currency, and model logic
- `scripts/ui.js` — UI rendering and event handling; defines `App.init` and `App.render`
- `scripts/main.js` — Entry point that initializes and renders the app
- `assets/logo.svg` — App logo

## Accessibility
- High-contrast palette, keyboard focus states, and semantic markup
- Respects users with reduced motion preference

## Data and privacy
All data is stored locally in your browser via `localStorage`. No data leaves your device unless you export it yourself.

## Notes on exchange rates
Rates are stored as "1 unit equals USD" values. Conversions work between any two currencies using USD as an anchor. You can edit rates manually at any time. If online, click "Update rates" to fetch current rates.
