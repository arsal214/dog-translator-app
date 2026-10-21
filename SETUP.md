# Dog Translator — setup & status

## Commands
- `npm start` — dev server (needs a **development build**; Expo Go can't run RevenueCat/Firebase)
- `npm run typecheck`, `npm test`
- `eas build --platform android --profile development`
- `eas build --platform android --profile production`
- `eas build --platform ios --profile production`

## You must provide
1. **Supabase project**: run `supabase/migrations/0001_init.sql`; enable *Anonymous sign-ins*; deploy functions
   (`supabase functions deploy analyze-bark scan-dog assistant portrait rc-webhook delete-account`);
   secrets: `ANTHROPIC_API_KEY`, `RC_WEBHOOK_SECRET`. Copy `.env.example` → `.env` (URL + anon key).
2. **RevenueCat**: products + an entitlement named `pro`; set `EXPO_PUBLIC_RC_IOS_KEY` / `_ANDROID_KEY`;
   webhook → `rc-webhook` function with Authorization = `RC_WEBHOOK_SECRET`. Configure the free trial in App Store Connect / Play Console (one per Apple ID is enforced by the store; `entitlements.trial_used` records it per account).
3. **Firebase**: `GoogleService-Info.plist` and `google-services.json` in the repo root (referenced by app.json); APNs key uploaded to Firebase.
4. **Licensed audio** for `src/content/sounds.ts` (100+ sounds, phrase sounds per size) — none exist yet.
5. **Hosted Terms/Privacy URLs** (placeholders in `app/paywall.tsx`).
6. **App icon / splash assets** (`assets/`), Apple/Google developer accounts, EAS login (`eas login`, `eas init`).

## Added since the first pass
- Languages: en, es, fr, de, pt (device-language detection, manual picker in More). The es/fr/de/pt text is my translation: have a native speaker review it. The choice of those 4 was mine.
- Local daily training reminder (6 PM, expo-notifications), plus FCM token registration and deep links.
- Import of **WAV** files for bark analysis. Other formats are rejected with a clear message (no on-device decoder for m4a/mp3).
- Voice input and typed-phrase matching on Human→Dog (expo-speech-recognition, development build only).
- iOS home-screen/lock-screen widgets (Today's mood, Quick record) via expo-widgets. Needs a native build; never built or seen on a device.
- Share a result as an image (share sheet).
- Figma alignment of Home, the result screen, the tab bar (raised Translate button) and profile photo.

## Figma sync status
The app follows the **updated** Figma theme (navy + amber; tokens in `src/theme/tokens.ts`, read from the file's variables). Screens rebuilt to match their frames: Home (C1/C2), Bark→Human ready/recording/upload sheet/result (D1, D2, D4, D11), Human→Dog (E2). Remaining pages (4 onboarding, 6–11, 12 flows) get the new colours but their layouts are not yet matched frame-by-frame.

## Not built yet
- **Shareable video**: no maintained Expo-compatible encoder exists (ffmpeg-kit is retired). It needs a custom native module (AVAssetWriter / MediaCodec). Sharing is text + image for now.
- Android widgets; widget taps just open the app (no deep link to Record).
- Cloud sync (schema + RLS exist; the app is local-first), Apple/Google/email sign-in, the portrait provider (and uploading the source photo).
- Result screen: the design's "Did this feel right?" feedback and "Make video" button.
- Figma: only Home, the result screen, the paywall and onboarding were compared (screenshots and metadata, never rendered side by side). The screens from pages 5–12 (sound library, scanner, assistant, etc.) are not matched to the design pixel-for-pixel.
- Bark analysis is **experimental**: an LLM interprets loudness/timing measurements, not a validated dog-vocalisation model.

## Must test on real devices
Recording/interruptions, whistle above ~16 kHz, clicker latency & haptics, purchases/restore, push, builds.
