import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';
import { supabase } from './supabase';

const ENTITLEMENT = 'pro';
const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

type PurchaseState = {
  ready: boolean;
  isPro: boolean;
  packages: PurchasesPackage[];
  set: (p: Partial<PurchaseState>) => void;
};
export const usePurchases = create<PurchaseState>((set) => ({ ready: false, isPro: false, packages: [], set }));

const apply = (info: CustomerInfo) => usePurchases.getState().set({ isPro: !!info.entitlements.active[ENTITLEMENT] });

/** Safe to call at startup: does nothing without a key or in Expo Go (no native module). */
export async function initPurchases() {
  if (!key) return;
  try {
    const { data } = await supabase.auth.getSession();
    Purchases.configure({ apiKey: key, appUserID: data.session?.user.id }); // must match the Supabase user id for the webhook
    Purchases.addCustomerInfoUpdateListener(apply);
    apply(await Purchases.getCustomerInfo());
    const offerings = await Purchases.getOfferings();
    usePurchases.getState().set({ ready: true, packages: offerings.current?.availablePackages ?? [] });
  } catch {
    /* leave isPro=false; paywall shows an unavailable state */
  }
}

export type PurchaseResult = 'success' | 'cancelled' | 'error';
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo); // Pro is granted only if RevenueCat reports the entitlement active
    return customerInfo.entitlements.active[ENTITLEMENT] ? 'success' : 'error';
  } catch (e) {
    return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'error';
  }
}

export async function restore(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return false;
  }
}
