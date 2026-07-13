import { View, Text, Pressable } from 'react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

// Shared error + retry block — replaces the inline error UI repeated across the
// bookings list, booking detail, and calendar screens.
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-10">
      <Text className="text-red-600 text-center mb-3">
        {message || '読み込みに失敗しました'}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="px-4 py-2 rounded-lg bg-brand active:opacity-80">
          <Text className="text-white font-medium">再試行</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
