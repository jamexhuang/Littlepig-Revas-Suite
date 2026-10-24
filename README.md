# Littlepig: Revas Suite

Integrated purchasing and financial analysis platform for the [REVAS](https://travel.revas.pl/) business simulation game (travel agency management).

This is an unofficial, personal tool. It is not affiliated with or endorsed by REVAS or the game's operators.

## Features

- **Purchasing Module**: Import supplier data from CSV/Excel, manage purchasing lists, smart cost optimization, order analysis and CSV export
- **Analyzer Module**: HR cost analysis, OpEx budgeting, demand forecasting with seasonality, service pricing, profitability modeling with interactive charts
- **Scenario Management**: Save, load and compare business scenarios with autosave support
- **Chrome Extension**: Automated order processing for the Revas game platform
- **Bilingual UI**: Full English and Chinese (zh-TW) support

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 19, Next.js 16 (static export), Tailwind CSS 4 |
| Charts | Recharts |
| Data | Firebase (Firestore with offline persistence), localStorage |
| Utilities | xlsx (Excel/CSV parsing), Lucide React (icons) |

## Project Structure

```
Littlepig/
├── src/                        # Application source code
│   ├── app/                    #   Next.js App Router (layout, page, styles)
│   ├── components/
│   │   ├── modules/            #   PurchasingModule, AnalyzerModule
│   │   └── ui/                 #   Reusable UI components (Button, Card, Input, etc.)
│   ├── hooks/                  #   Custom hooks (useFirestore, useScenarios, usePersistence)
│   ├── lib/                    #   Firebase config (env based), utility functions
│   ├── i18n/                   #   Translations (en.json, zh.json) and I18nContext
│   ├── data/                   #   Constants and default supplier data
│   └── utils/                  #   CSV parser
├── extension/                  # Chrome Extension (Revas order automation)
├── scripts/                    # Browser console utility scripts
├── firebase.json               # Firebase hosting config
├── firestore.rules             # Firestore security rules (deny-all default, see notes)
└── next.config.mjs             # Next.js config (static export)
```

## Development

```bash
# Install dependencies
npm install

# Configure your own Firebase project for cloud scenario sync
cp .env.example .env.local   # then fill in your Firebase web app values

# Start development server
npm run dev

# Build for production (static export to out/)
npm run build
```

## Notes on this public release

- This repository contains the application source code only. Game data exports, scraped platform pages and research datasets used during development are not included, because they belong to the REVAS platform or to other players.
- The default supplier dataset in `src/data/defaultSupplierData.js` is factual in-game reference data (resource names, quality levels and prices) that the app needs to work out of the box.
- `src/lib/firebase.js` reads its configuration from environment variables, so no live project identifiers ship with the code. Cloud sync targets your own Firebase project.
- The shipped `firestore.rules` denies all access by default. The app has no user authentication, so allowing public read/write on the `modules` collection would let anyone read or overwrite synced scenarios. Loosen the rules only if you accept that, or add Firebase Auth first.

## Data Flow

1. **Supplier data** is imported via CSV/Excel upload or loaded from embedded defaults (`src/data/defaultSupplierData.js`)
2. **Business parameters** (HR, OpEx, pricing) are configured in the Analyzer Module
3. **Scenarios** are saved to localStorage with optional Firestore cloud backup
4. **Reports** can be exported as CSV from the Purchasing Module

## License

Copyright (C) 2025-2026 Huang Tzu-Chun (James Huang).

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](LICENSE) for more details.

REVAS and all game content remain the property of their respective owners. This license covers only the code and documentation written for this project.
