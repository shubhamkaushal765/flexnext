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
