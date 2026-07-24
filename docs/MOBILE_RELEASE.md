# PropOS mobile release (Phase 10.1)

## Bundle IDs

| Platform | Identifier |
|----------|------------|
| iOS | `com.nexovo.propos` |
| Android | `com.nexovo.propos` |

## EAS profiles

`apps/mobile/eas.json`:

| Profile | Use |
|---------|-----|
| `development` | Dev client, internal |
| `preview` | Internal APK / ad-hoc; channel `preview` |
| `production` | Store builds; channel `production`; autoIncrement |

```bash
cd apps/mobile
npx eas-cli login
# Set extra.eas.projectId in app.config.ts from expo.dev
npx eas build --profile preview --platform android
npx eas build --profile production --platform all
npx eas submit --profile production --platform android
npx eas submit --profile production --platform ios
```

## OTA (EAS Update)

Channels match release branches / profiles (`development` / `preview` / `production`).

```bash
npx eas update --channel preview --message "hotfix"
# Rollback: republish previous update group from expo.dev → Updates → Rollback
```

## Security

- Tokens: `expo-secure-store` (`src/secure-token.ts`)
- Crash: `@sentry/react-native` (`EXPO_PUBLIC_SENTRY_DSN`)
- Cert pins: `src/config.ts` → fill `CERT_PINS` before production lock-down

## Maestro smoke (login + leads)

```bash
# With emulator + app installed
maestro test apps/mobile/maestro/login-leads.yaml
```

CI: job `mobile-smoke` runs Maestro when `MOBILE_SMOKE=true` (optional; needs device farm).

## Store submission checklist

1. Create Expo project + fill `REPLACE_EAS_PROJECT_ID`
2. Generate Android keystore via EAS (or upload existing)
3. Create Apple App Store Connect app + credentials via `eas credentials`
4. Place Play service account JSON at `apps/mobile/secrets/google-play-service-account.json` (gitignored)
5. `eas build --profile production` then `eas submit`
6. Attach privacy policy URL + DPDP disclosures

## Acceptance note

`eas build --profile preview` requires Expo account + project ID — not run on the agent host. Config and Maestro flow are in-repo for operators.
