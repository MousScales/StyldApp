# Apple Tap to Pay on iPhone — App Review Requirements Checklist v1.6

**Attach this file to your email to Apple (ttpoientitlements@apple.com).**

| Field | Value |
|-------|-------|
| **Team ID** | 6TNGS7897R |
| **App Name** | Styld |
| **PSP Name** | Stripe |
| **Date** | March 21, 2026 |
| **Version** | 1.0.2 (build 8) |
| **Existing or New app** | Existing |
| **Distribution type** | Public |
| **Number of Devices** | N/A (App Store) — 4 registered test devices for Ad Hoc |

---

## Tab 1 — Requirements Checklist

| ID | Requirement | Status | How to Demonstrate | Comments |
|----|-------------|--------|-------------------|----------|
| **1.1** | Tap to Pay on iPhone XS+ | **Yes** | New User Flow + Checkout Flow | Stripe Terminal SDK `discoveryMethod: 'tapToPay'`; entitlement enabled in App ID. |
| **1.2** | iOS deployment target (primary payment) | **N/A** | — | Tap to Pay is a checkout option alongside Cash and Card — not the app’s primary payment method. Deployment target: iOS 16.4. |
| **1.3** | A12 / UIRequiredDeviceCapabilities | **Partial** | — | `UIRequiredDeviceCapabilities: arm64` in Info.plist; iPhone-only (`supportsTablet: false`). |
| **1.4** | osVersionNotSupported handling | **Yes** | Checkout Flow | `formatTapToPayError()` surfaces “update to latest iOS” when SDK returns unsupported OS errors. |
| **1.5** | Warm-up on launch / foreground | **Yes** | Existing User Flow | `TapToPayContext.warmUpReader()` on mount + `AppState` active via Stripe `easyConnect`. |
| **1.6** | Merchant acceptance status from Apple | **Yes** | New User Flow | Status via Stripe Terminal `connectedReader` / `easyConnect` — not stored as a local “enabled” flag. |
| **1.7** | Face ID / Touch ID login | **Yes** | New User Flow | Sign in with Apple on login screen. |
| **1.8** | Human Interface Guidelines | **Yes** | All flows | Native iOS navigation, SF Symbols on Tap to Pay buttons, standard modal patterns. |
| **1.9** | Developer Marketing Guidelines | **Yes** | New + Existing User Flow | Copy uses “Tap to Pay on iPhone”; hero splash aligned with marketing guide. |
| **2.1** | Discover account + Tap to Pay path | **Yes** | New User Flow | Account onboarding → site publish → Styld Pay (Stripe Connect) → Tap to Pay prompt / Profile → Tap to Pay settings. |
| **2.2** | Fully digital onboarding on iPhone | **Yes** | New User Flow | Account creation, Stripe Connect KYC, and Tap to Pay T&C acceptance all in-app on iPhone. |
| **2.3** | Onboarding under 15 minutes | **Yes** | New User Flow | Typical path: sign up → publish site → Stripe Connect → enable Tap to Pay → test transaction. |
| **3.1** | Visible Tap to Pay communication | **Yes** | New + Existing User Flow | Hero splash, push notification, Profile menu item, post–Stripe Connect prompt. |
| **3.2** | Full-screen splash modal | **Yes** | Existing User Flow | `TapToPaySplashModal` shown once to eligible users after Styld Pay is active. |
| **3.3** | One-time push to eligible users | **Yes** | Existing User Flow | Local notification via `TapToPayCoordinator` (production: replace with remote push campaign). |
| **3.4** | Enable instructions after merchant onboarding | **Yes** | New User Flow | `TapToPayPostConnectPrompt` after Stripe Connect reaches `ready`. |
| **3.5** | Clear action to accept T&C | **Yes** | New User Flow | “Enable Tap to Pay on iPhone” triggers Stripe `easyConnect` with `tosAcceptancePermitted: true`. |
| **3.6** | Enable outside checkout (Settings) | **Yes** | Existing User Flow | Profile → **Tap to Pay on iPhone** → `TapToPaySettingsScreen`. |
| **3.7** | Checkout trigger or pre-enable | **Yes** | Checkout Flow | Summary step shows **Tap to Pay on iPhone** button; auto-opens T&C if reader not connected. |
| **3.8** | T&C accepted by authorized user | **Yes** | New User Flow | Single-merchant app; logged-in Stripe Connect account owner accepts terms. |
| **3.8.1** | Non-admin message | **N/A** | — | No multi-user roles; each stylist owns their Stripe account. |
| **3.8.2** | Apple Business Connect (enterprise) | **N/A** | — | Public App Store distribution. |
| **3.9** | Try-it-out screen after tutorial | **Recommended — Partial** | Checkout Flow | Education modal → user proceeds to checkout Tap to Pay step to collect payment. |
| **3.9.1** | Configuration progress indicator | **Yes** | New User Flow | `TapToPaySettingsScreen` + checkout initializing UI while `connectPhase === 'initializing'`. |
| **4.1** | ProximityReaderDiscovery (iOS 18+) | **No — Planned** | — | Custom `MerchantEducationModal` used today. Native `ProximityReaderDiscovery` module planned for iOS 18+. |
| **4.2** | Education after T&C | **Yes** | New User Flow | `MerchantEducationModal` after accepting terms. |
| **4.3** | Education in Settings / Help | **Yes** | Existing User Flow | Profile → Tap to Pay → “How to accept payments”. |
| **4.4** | Apple marketing toolkit screens | **Partial** | New User Flow | Content follows Tap to Pay on iPhone Marketing Guide themes; not pixel-perfect toolkit assets. |
| **4.5** | Contactless card education | **Yes** | New User Flow | Merchant education modal — contactless cards section. |
| **4.6** | Apple Pay / wallets education | **Yes** | New User Flow | Merchant education modal — digital wallets section. |
| **4.7** | PIN + accessibility (region) | **Yes** | Checkout Flow (US) | PIN section in education modal; PIN handled by Apple Tap to Pay UI during transaction. |
| **4.8** | Fallback payment method (region) | **Yes** | Checkout Flow | Cash and Card (manual entry) offered alongside Tap to Pay; education mentions fallback. |
| **5.1** | Prominent Tap to Pay checkout button | **Yes** | Checkout Flow | Finish appointment → Summary → **Tap to Pay on iPhone** (top). |
| **5.2** | Button accessible without scrolling | **Yes** | Checkout Flow | Primary button in fixed footer on Summary step. |
| **5.3** | Button never greyed out; opens T&C if needed | **Yes** | Checkout Flow | Button always enabled on Summary; `connectTapToPay` on Tap to Pay step if reader not connected. |
| **5.4** | Regional button copy | **Yes** | Checkout Flow | Uses Apple string **“Tap to Pay on iPhone”** (`TAP_TO_PAY_BUTTON_LABEL`). |
| **5.5** | SF Symbol iconography | **Yes** | Checkout Flow | `wave.3.right.circle.fill` via `expo-symbols` / `TapToPayWaveIcon`. |
| **5.6** | UI within 1 second (90%) | **Yes** | Checkout Flow | Reader warm-up on launch/foreground; Stripe `easyConnect` before `processPaymentIntent`. |
| **5.7** | Initializing screen while configuring | **Yes** | Checkout Flow | Initializing card + disabled button while reader prepares. |
| **5.8** | Processing screen after card read | **Yes** | Checkout Flow | Stripe Terminal / Apple system UI shows processing state. |
| **5.9** | Approved / declined / timeout outcome | **Yes** | Checkout Flow | Stripe Terminal result → in-app alert; appointment completes on success. |
| **5.10** | Confidential digital receipt | **Yes** | Checkout Flow | Email receipt via Stripe (`customerEmail` on payment intent); review request email after appointment. |
| **5.11** | Regional compliance | **Yes** | Checkout Flow | US deployment; Cash/Card fallbacks available. |
| **6.1** | Launch email to eligible users | **Pending — Marketing** | — | Send Apple “Launch” email template to active Styld Pay merchants before App Store release. |
| **6.2** | In-app Hero splash | **Yes** | Existing User Flow | `TapToPaySplashModal` (requirement 3.2). |
| **6.3** | In-app push notification | **Yes** | Existing User Flow | One-time local notification in `TapToPayCoordinator` (use APNs campaign at launch). |

---

## Tab 2 — User Flow Recordings & Other Information

| Item | Status | Details |
|------|--------|---------|
| **New User Flow recording** | **Required — attach video** | Record on second iPhone: sign up → publish site → Stripe Connect KYC → Tap to Pay prompt → accept T&C → education → progress indicator → complete configuration → settings education link. |
| **Existing User Flow recording** | **Required — attach video** | Record: login → hero splash → checkout button visible before T&C → enable flow → education → settings education → progress if configuring. |
| **Checkout Flow recording** | **Required — attach video** | Record: finish appointment → tip → summary with Tap to Pay on top → complete contactless transaction → show outcome. Include PIN test card if applicable. |

### Other Information

| Field | Value |
|-------|-------|
| **Supported schemes** | Visa, Mastercard, American Express, Discover |
| **Domestic scheme** | N/A (US) |
| **Refund supported** | Referenced refund (via Stripe Dashboard / support — requires original Tap to Pay transaction) |
| **Receipt methods** | Email (via Stripe / Styld transactional email) |
| **PIN fallback alternatives** | Card (manual Stripe Payment Sheet), Cash |
| **Other notes** | PSP: Stripe Terminal React Native SDK. Bundle ID: `com.crmstyld.app`. Requesting Ad Hoc / TestFlight entitlement for `com.apple.developer.proximity-reader.payment.acceptance` (currently development-only on Team ID 6TNGS7897R). Item **4.1** (ProximityReaderDiscovery) and **6.1** (launch email) outstanding before final App Store submission. |

---

## Implementation map (for reviewers)

| Feature | Location |
|---------|----------|
| Warm-up + connect | `src/context/TapToPayContext.tsx` |
| Hero splash + push | `src/components/tapToPay/TapToPayCoordinator.tsx` |
| Post–Stripe prompt | `src/components/tapToPay/ConnectedAccountsTapToPayPrompt.tsx` |
| Settings + education | `src/screens/business/TapToPaySettingsScreen.tsx` |
| Checkout UI | `src/components/booking/FinishAppointmentFlow.tsx` |
| SF Symbol button | `src/components/tapToPay/TapToPayWaveIcon.tsx` |

---

## Email checklist before sending

- [ ] Record and attach 3 videos (New User, Existing User, Checkout)
- [ ] Send launch email (6.1) or note planned date in email body
- [ ] Confirm TestFlight build includes Tap to Pay entitlement (Ad Hoc/publishing approval from Apple)
- [ ] Attach this completed checklist
