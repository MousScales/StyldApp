/**
 * Native Tap to Pay via Stripe Terminal SDK (requires dev client rebuild + Apple entitlement).
 * Set to false for EAS Ad Hoc builds until Apple grants distribution Tap to Pay entitlement.
 * Re-enable with app.json: ios.entitlements + stripe plugin tapToPayCheck: true
 */
export const TAP_TO_PAY_NATIVE_ENABLED = false;
