import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';
import { refreshCredits } from './credits';
import { log } from './logger';
import { supabase } from './supabase';

const ENTITLEMENT = 'pro';
const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

type PurchaseState = {
  ready: boolean;
  /** True once RevenueCat has answered (or failed), so isPro=false can be trusted. */
  checked: boolean;
  isPro: boolean;
  packages: PurchasesPackage[];
  /** Last offerings failure, shown on the paywall so TestFlight testers can report it. */
  offeringsError?: string;
  set: (p: Partial<PurchaseState>) => void;
};
export const usePurchases = create<PurchaseState>((set) => ({ ready: false, checked: false, isPro: false, packages: [], set }));

const apply = (info: CustomerInfo) => usePurchases.getState().set({ checked: true, isPro: !!info.entitlements.active[ENTITLEMENT] });
const checkedFree = () => usePurchases.getState().set({ checked: true });
let configured = false;

/** Safe to call at startup: does nothing without a key or in Expo Go (no native module). */
export async function initPurchases() {
  if (!key) {
    checkedFree();
    return log.warn('purchases_no_key', undefined, { platform: Platform.OS });
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: key, appUserID: data.session?.user.id }); // must match the Supabase user id for the webhook
    Purchases.addCustomerInfoUpdateListener(apply);
    configured = true;
  } catch (e) {
    checkedFree();
    return log.error('purchases_configure_failed', e);
  }
  // If the session arrives later (offline at launch), move RevenueCat onto the Supabase user so the webhook can match it.
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id;
    if (!configured || !id) return;
    Purchases.getAppUserID()
      .then((current) => (current === id ? null : Purchases.logIn(id)))
      // Moving to another account doesn't move this device's purchase until it is synced (RevenueCat transfer).
      .then((r) => (r ? Purchases.syncPurchases().then(() => Purchases.getCustomerInfo()) : null))
      .then((info) => { if (info) { apply(info); void refreshCredits(); } })
      .catch((e) => log.warn('purchases_login_failed', e));
  });
  // Fetched independently so a customer-info failure doesn't hide the packages.
  Purchases.getCustomerInfo().then(apply).catch((e) => {
    checkedFree();
    log.warn('purchases_customer_info_failed', e);
  });
  await loadOfferings();
}

/** Also called when the paywall opens, so a failed or empty startup fetch is retried. */
export async function loadOfferings() {
  const set = usePurchases.getState().set;
  if (!configured) return set({ ready: true, offeringsError: key ? 'RevenueCat not configured' : 'Missing RevenueCat API key' });
  set({ ready: false, offeringsError: undefined });
  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) log.warn('purchases_no_current_offering', undefined, { offerings: Object.keys(offerings.all) });
    set({ ready: true, packages: offerings.current?.availablePackages ?? [], offeringsError: offerings.current ? undefined : 'No current offering in RevenueCat' });
  } catch (e) {
    log.error('purchases_offerings_failed', e); // paywall shows an unavailable state
    set({ ready: true, offeringsError: e instanceof Error ? e.message : String(e) });
  }
}

export type PurchaseResult = 'success' | 'cancelled' | 'error';
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const context = { product: pkg.product.identifier, package: pkg.packageType, price: pkg.product.price, currency: pkg.product.currencyCode };
  log.info('purchase_started', context);
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo); // Pro is granted only if RevenueCat reports the entitlement active
    // The plan's credits arrive through the RevenueCat webhook a few seconds later.
    for (const ms of [0, 4000, 10000]) setTimeout(() => void refreshCredits(), ms);
    const ok = !!customerInfo.entitlements.active[ENTITLEMENT];
    if (ok) log.info('purchase_success', context);
    else log.error('purchase_no_entitlement', 'purchase completed but pro is not active', context);
    return ok ? 'success' : 'error';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) {
      log.info('purchase_cancelled', context);
      return 'cancelled';
    }
    log.error('purchase_failed', e, { ...context, code: (e as { code?: string }).code });
    return 'error';
  }
}

export async function restore(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    for (const ms of [0, 4000]) setTimeout(() => void refreshCredits(), ms);
    const ok = !!info.entitlements.active[ENTITLEMENT];
    log.info('restore', { restored: ok });
    return ok;
  } catch (e) {
    log.error('restore_failed', e);
    return false;
  }
}
