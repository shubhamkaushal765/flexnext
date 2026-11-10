# FlexNext

FlexNext: personal indoor cycling app (Vite + React + Capacitor, Android). Multiple local profiles, BLE sensors (HR, power, FTMS trainer), default training modes.

## Develop

```bash
npm install
npm run dev              # Vite dev server
npm test                 # Vitest unit tests
npm run build            # type check + production build to dist/
npx cap sync android     # copy dist/ and plugins into android/
npx cap open android     # open the Android project in Android Studio
```

## Web

`npm run dev` runs the app in a browser. Bluetooth sensors work through Web Bluetooth in Chrome or Edge (desktop and Android) only, and need HTTPS or localhost. Data stays in that browser's storage and is separate from the phone.
