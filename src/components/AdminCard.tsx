import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface AdminCardProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** When provided, the whole card becomes tappable. */
  onPress?: () => void;
}

// Reusable surface card for admin lists / detail rows.
export default function AdminCard({ title, subtitle, right, children, onPress }: AdminCardProps) {
  const inner = (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-neutral-200">
      {(title || right) && (
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            {title ? (
              <Text className="text-base font-semibold text-brand">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text className="text-xs text-neutral-500 mt-0.5">{subtitle}</Text>
            ) : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
