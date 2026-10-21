import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import pt from './pt.json';

export const LANGUAGES = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português' } as const;
export type Lang = keyof typeof LANGUAGES;
const KEY = 'language-v1';

// Language comes from the device's preferred languages (not region), then the user's manual choice overrides it.
const detect = (): Lang => {
  for (const l of getLocales()) if (l.languageCode && l.languageCode in LANGUAGES) return l.languageCode as Lang;
  return 'en';
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es }, fr: { translation: fr }, de: { translation: de }, pt: { translation: pt } },
  lng: detect(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(KEY).then((v) => { if (v && v in LANGUAGES) void i18n.changeLanguage(v); }).catch(() => {});

export const setLanguage = (l: Lang) => {
  AsyncStorage.setItem(KEY, l).catch(() => {});
  return i18n.changeLanguage(l);
};

export default i18n;
