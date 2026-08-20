/**
 * 1Sygnal Web SDK — Thin Loader (~100 lines)
 *
 * Injects the hosted bundle <script> tag and queues API calls
 * until the bundle signals readiness.
 */
/**
 * Options accepted by `init()`'s second argument.
 *
 * Structurally mirrors — but is declared independently from — the CDN bundle's own
 * `InitOptions` (`src/bundle/core/sdk.ts`). The loader and bundle compile as separate Rollup
 * entry points (`src/loader/index.ts` / `src/bundle/index.ts`) and the loader ships alone:
 * `@rollup/plugin-typescript`'s declaration emission mirrors this package's whole
 * `tsconfig.json` `include` set, not just this file's own import graph, so a type-only import
 * from `../bundle/core/sdk` would make this file's own `.d.ts` reference
 * `dist/loader/bundle/core/sdk.d.ts` — a file `.github/workflows/release-web-sdk.yml` never
 * copies into the published package. Keep the two definitions in sync by hand; there is no
 * automated drift check yet.
 */
export interface OneSygnalInitOptions {
    /** Base URL of the 1Sygnal ingestion API. @default "https://sdk-api.1sygnal.app" */
    apiUrl?: string;
    /** Logs SDK lifecycle messages to the console. @default false */
    debug?: boolean;
    /** Automatically tracks `first_visit` / `session_start` / `page_view` / `page_leave`. @default true */
    autoTrack?: boolean;
    /** Enables exit-intent trigger detection. @default true */
    exitIntent?: boolean;
    /** Starts surveys disabled (as if `setSurveysEnabled(false)` had been called) until you
     *  explicitly opt in — for consent-gated integrations. @default false */
    consentRequired?: boolean;
    /** URL of the shared `1sygnal.css` bundle, loaded inside the survey's shadow root so
     *  `:host`-scoped styles apply. Auto-derived from the bundle script's own `src` when omitted. */
    cssUrl?: string;
    /** `Accept-Language` tag (e.g. `"fr"`, `"fr-FR"`), fixed for the lifetime of this `init()`
     *  call — there is no live `setLocale()` on web. @default navigator.language */
    locale?: string;
    /**
     * @internal Dev/test-only. Bypasses the server-configured cooldown/daily cap. Not part of
     * the documented public configuration surface for production integrations.
     * @default false
     */
    disableThrottling?: boolean;
    /**
     * @internal Dev/test-only. Overrides the base URL the trigger-rules script is fetched from.
     * Production always uses the CDN regardless of `apiUrl`.
     */
    jsRulesEngineUrl?: string;
    /** Loader-only. Overrides the CDN URL the bundle `<script>` is injected from. Read directly
     *  by the loader's own `injectBundle()`; never forwarded into the bundle's own init options. */
    sdkUrl?: string;
    /** Loader-only. Overrides the Subresource Integrity hash set on the injected `<script>`.
     *  Read directly by `injectBundle()`, same as `sdkUrl`. */
    integrity?: string;
}
/**
 * Payload shapes for each event the bundle actually emits (`this.emit(...)` calls in
 * `src/bundle/core/sdk.ts` — grep-confirmed: exactly these four, no others exist).
 */
export interface SurveyEventPayloadMap {
    /** Fires once a survey overlay is confirmed attached/rendered. */
    'survey:shown': {
        surveyId: string;
    };
    /** Fires once per answered question. */
    'survey:step': {
        surveyId: string;
        questionId: string;
        step: number;
    };
    /** Fires once a survey is fully completed. */
    'survey:completed': {
        surveyId: string;
    };
    /** Fires when a survey is dismissed without completion. */
    'survey:dismissed': {
        surveyId: string;
    };
}
/** The event names `on()`/`off()` accept. A closed union, not an open `string` — adding a
 *  5th event is an additive, non-breaking change to this type; it isn't meant to be
 *  future-proofed against forged/made-up event names, since the bundle doesn't support them. */
export type SurveyEventName = keyof SurveyEventPayloadMap;
/** A handle returned by `on()`; call `.cancel()` to stop receiving that event. Declared
 *  independently from (but structurally identical to) the bundle's own `Registration` — see
 *  the note on `OneSygnalInitOptions` for why the two aren't imported from one another. */
export interface Registration {
    cancel(): void;
}
/**
 * The `onesygnal-web-sdk` npm package's default export.
 *
 * Every method here either forwards to the real CDN bundle (`window._oneSygnal`) once it has
 * loaded, or queues the call and returns `undefined` — there's nothing yet to hand back. This
 * is why several return types below include `| undefined` even though the CDN bundle's own
 * equivalents never do: it's the loader's honest behavior, not an incomplete type.
 */
export interface OneSygnalLoaderAPI {
    /**
     * Loads the CDN bundle and initializes the SDK. Idempotent — a second call is a no-op.
     * @param apiKey - Your project's public API key.
     * @param options - See {@link OneSygnalInitOptions}.
     * @returns Always `void` — unlike the CDN bundle's own `init()`, which returns
     * `Promise<void>`. Poll {@link OneSygnalLoaderAPI.isInitialized} or listen for a survey
     * event if you need to know when the bundle is ready.
     */
    init(apiKey: string, options?: OneSygnalInitOptions): void;
    /**
     * Tracks a custom event.
     * @param eventName - Event name.
     * @param properties - Arbitrary JSON-serializable event properties.
     * @returns The bundle's settle-once-ready `Promise<void>`, or `undefined` if this call was
     * queued (the bundle isn't ready yet) — there's no promise yet to return.
     */
    track(eventName: string, properties?: Record<string, unknown>): Promise<void> | undefined;
    /**
     * Associates the current anonymous visitor with a known user ID.
     * @param userId - Your own identifier for this user.
     * @param attributes - Arbitrary JSON-serializable user attributes.
     * @returns Same queued-call caveat as {@link OneSygnalLoaderAPI.track}.
     */
    identify(userId: string, attributes?: Record<string, unknown>): Promise<void> | undefined;
    /**
     * Clears the identified user, reverting to a fresh anonymous visitor.
     * @returns Same queued-call caveat as {@link OneSygnalLoaderAPI.track}.
     */
    logout(): Promise<void> | undefined;
    /**
     * Enables or disables survey display without affecting event tracking.
     * @param enabled - `false` suppresses all survey display; tracking is unaffected.
     */
    setSurveysEnabled(enabled: boolean): void;
    /**
     * @returns Whether surveys are enabled, or `undefined` if called before the bundle is
     * ready. A read, not a write — there's no future moment to queue it against.
     */
    areSurveysEnabled(): boolean | undefined;
    /** @returns `false` until the CDN bundle has loaded and finished `init()`. */
    isInitialized(): boolean;
    /**
     * Subscribes to a survey lifecycle event.
     * @param event - One of {@link SurveyEventName}.
     * @param callback - Called with the event's payload — see {@link SurveyEventPayloadMap}.
     * @returns A {@link Registration} once the bundle is ready; `undefined` if this call was
     * queued. Unlike `track`/`identify`, a queued `on()` cannot later be cancelled through its
     * return value (the queue replay discards it) — use {@link OneSygnalLoaderAPI.off} with the
     * same callback reference instead.
     * @example
     * ```ts
     * oneSygnal.on('survey:step', (data) => console.log(data.step, data.questionId));
     * ```
     */
    on<E extends SurveyEventName>(event: E, callback: (data: SurveyEventPayloadMap[E]) => void): Registration | undefined;
    /**
     * Unsubscribes a callback previously passed to {@link OneSygnalLoaderAPI.on}, matched by
     * reference — the only way to cancel a subscription registered before the bundle was ready
     * (whose `on()` call returned `undefined`, not a `Registration`).
     */
    off<E extends SurveyEventName>(event: E, callback: (data: SurveyEventPayloadMap[E]) => void): void;
    /**
     * Forces any pending tracked events/survey responses to send immediately.
     * @returns Same queued-call caveat as {@link OneSygnalLoaderAPI.track}.
     */
    flush(): Promise<void> | undefined;
    /**
     * Tears down the SDK: stops timers, removes listeners, destroys any active survey.
     * @returns Always `void` — the bundle's own `shutdown()` is synchronous, not a `Promise`. A
     * queued (pre-ready) call is simply dropped — there is no live instance yet to shut down.
     */
    shutdown(): void;
}
declare const _default: OneSygnalLoaderAPI;
export default _default;
