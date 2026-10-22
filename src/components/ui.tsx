import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, mood as moodTokens, radius, shadow, type, type Mood } from '@/theme/tokens';

export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 32, gap: 16 }, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 16 }, style]}>{children}</View>
  );
  return <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={['top']}>{body}</SafeAreaView>;
}

export const T = {
  Title: (p: { children: ReactNode; style?: object }) => <Text accessibilityRole="header" style={[type.title1, { color: color.text }, p.style]}>{p.children}</Text>,
  Head: (p: { children: ReactNode; style?: object }) => <Text style={[type.headline, { color: color.text }, p.style]}>{p.children}</Text>,
  Body: (p: { children: ReactNode; style?: object }) => <Text style={[type.subhead, { color: color.textSecondary }, p.style]}>{p.children}</Text>,
  Overline: (p: { children: ReactNode }) => <Text style={[type.overline, { color: color.textSecondary }]}>{String(p.children).toUpperCase()}</Text>,
};

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ backgroundColor: color.surface, borderRadius: radius.lg, padding: 16 }, shadow.card, style]}>{children}</View>;
}

type ButtonProps = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'tertiary'; loading?: boolean; disabled?: boolean };
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const off = disabled || loading;
  const bg = variant === 'primary' ? (off ? color.disabled : color.primary) : variant === 'secondary' ? color.brandSoft : 'transparent';
  const fg = color.onPrimary; // navy on amber; navy label on the cream secondary
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        { height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed && variant === 'primary' ? color.primaryPressed : bg },
        variant === 'primary' && !off && shadow.glow,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[type.button, { color: off && variant === 'primary' ? color.textSecondary : fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => ({ height: 36, paddingHorizontal: 16, borderRadius: radius.full, justifyContent: 'center', backgroundColor: selected ? color.brandStrong : color.surface, borderWidth: 1, borderColor: selected ? color.brandStrong : color.border, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Text style={[type.subheadStrong, { color: selected ? color.onBrand : color.text }]}>{selected ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', height: 40, borderRadius: radius.sm, backgroundColor: color.subtle, padding: 3 }}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="button"
          accessibilityState={{ selected: o.key === value }}
          onPress={() => onChange(o.key)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm - 3, backgroundColor: o.key === value ? color.surface : 'transparent' }}
        >
          <Text style={[type.subheadStrong, { color: o.key === value ? color.text : color.textSecondary }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TextField({ label, error, ...rest }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.subheadStrong, { color: color.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={color.textTertiary}
        accessibilityLabel={label}
        style={[type.body, { height: 52, borderRadius: radius.sm, paddingHorizontal: 16, backgroundColor: color.surface, color: color.text, borderWidth: 1, borderColor: error ? color.danger : color.border }]}
        {...rest}
      />
      {error ? <Text style={[type.footnote, { color: color.textDanger }]}>{error}</Text> : null}
    </View>
  );
}

// Colour is never the only signal: dot + text label.
export function MoodBadge({ mood, label }: { mood: Mood; label: string }) {
  const m = moodTokens[mood];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: radius.full, backgroundColor: m.bg }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.fg }} />
      <Text style={[type.caption, { color: color.text }]}>{label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });

export function DogAvatar({ name, uri, size = 48, selected }: { name: string; uri?: string; size?: number; selected?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandSoft, borderWidth: selected ? 2 : 0, borderColor: color.primary }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} accessibilityLabel={name} /> : <Text style={[type.headline, { color: color.brandStrong }]}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}
