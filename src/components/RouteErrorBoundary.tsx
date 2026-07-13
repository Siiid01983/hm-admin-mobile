import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ErrorBoundaryProps } from 'expo-router';

// Branded crash-recovery screen. Expo Router renders a route's exported
// `ErrorBoundary` when its subtree throws during render, so a component error
// shows this recoverable screen instead of a blank/red screen.
export default function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 bg-brand-cream">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <Text className="text-2xl font-bold text-brand mb-2">問題が発生しました</Text>
        <Text className="text-sm text-neutral-600 mb-4">
          予期しないエラーが発生しました。再試行してください。
        </Text>
        <View className="bg-white border border-neutral-200 rounded-xl p-3 mb-6">
          <Text className="text-xs text-red-600">{error?.message || '不明なエラー'}</Text>
        </View>
        <Pressable
          onPress={() => retry()}
          className="bg-brand rounded-xl py-3.5 items-center active:opacity-80"
        >
          <Text className="text-white font-semibold">再試行</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
