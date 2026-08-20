# 1Sygnal Web SDK

Thin loader + CDN-hosted survey engine for 1Sygnal in-product surveys, event tracking, and
user identification.

## Installation

### npm

```bash
npm install onesygnal-web-sdk
```

```typescript
import oneSygnal from 'onesygnal-web-sdk';

oneSygnal.init('your-api-key', { apiUrl: 'https://sdk-api.1sygnal.app' });
```

The package has a **default export only** — there's no `{ init, track, identify }` named
export.

### Script tag (auto-init)

```html
<script
  src="https://sdk.1sygnal.app/js/onesygnal.js"
  data-api-key="your-api-key"
  data-api-url="https://sdk-api.1sygnal.app"
></script>
```

## Usage

### Tracking events

```typescript
oneSygnal.track('button_click', { id: 'cta' });
```

### Identifying users

```typescript
oneSygnal.identify('user-123', { plan: 'pro' });
```

Also available: `oneSygnal.logout()` to clear session/user state, and
`oneSygnal.setSurveysEnabled(enabled)` to toggle surveys at runtime.

### Listening for survey events

```typescript
oneSygnal.on('survey:completed', (event) => {
  // handle completion
});
```

Other available events: `"survey:shown"`, `"survey:step"`, `"survey:dismissed"`. Unsubscribe
with `oneSygnal.off(event, callback)`.

## How it works

`init()` returns `void`, not a Promise — it injects a `<script>` tag that loads the full SDK
bundle from 1Sygnal's CDN, and queues `track`/`identify`/`on`/etc. calls until that bundle
loads and signals readiness. There's nothing to `await`; calls made before the bundle is ready
are queued and replayed once it is. This lets survey-triggering fixes and features ship to
every embedded site immediately, without a dependency bump and redeploy.

### Mobile safe-area insets

Bottom/top-anchored surveys use `env(safe-area-inset-*)` to clear notches and the home
indicator on phones. Those `env()` values only resolve once the page opts in via:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

`init()` patches this in automatically (appending `viewport-fit=cover` to an existing
`<meta name="viewport">`, or adding one if the page has none), so this is a fallback, not a
hard requirement — but setting it yourself in the page `<head>` is still recommended, since it
takes effect before the SDK loads.

## Docs

Full integration guide: https://docs.1sygnal.app

## Other SDKs

- [iOS SDK](https://github.com/1Sygnal/1sygnal-ios-sdk)
- [Android SDK](https://github.com/1Sygnal/1sygnal-android-sdk)
