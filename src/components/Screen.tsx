import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  /** Optional title — renders the standard white top bar when provided. */
  title?: string;
  /** When provided, a back chevron is shown to the left of the title. */
  onBack?: () => void;
  /** Optional action node aligned to the right of the header. */
  headerRight?: ReactNode;
  children: ReactNode;
}

// Reusable screen shell: brand-cream SafeArea + an optional consistent top bar.
// Shared by every tab (and detail screens) so headers stay identical.
export default function Screen({ title, onBack, headerRight, children }: ScreenProps) {
  const showHeader = title || onBack || headerRight;
  return (
    <SafeAreaView className="flex-1 bg-brand-cream" edges={['top']}>
      {showHeader ? (
        <View className="flex-row items-center px-4 py-3 border-b border-neutral-200 bg-white">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="mr-1 -ml-1 px-2 py-1 rounded-lg active:opacity-60"
            >
              <Text className="text-brand text-xl">←</Text>
            </Pressable>
          ) : null}
          <Text className="text-lg font-bold text-brand flex-1">{title}</Text>
          {headerRight}
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}
