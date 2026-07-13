import { View, Text } from 'react-native';

// bg + text class per JP status label; unknown → neutral.
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  新規: { bg: 'bg-amber-100', text: 'text-amber-800' },
  確認中: { bg: 'bg-amber-100', text: 'text-amber-800' },
  確定: { bg: 'bg-green-100', text: 'text-green-800' },
  完了: { bg: 'bg-green-100', text: 'text-green-800' },
  キャンセル: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Statuses an admin can transition a booking TO from the detail screen.
// (新規 is the initial state, so it's not offered as an action.)
export const BOOKING_STATUSES = ['確認中', '確定', '完了', 'キャンセル'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-neutral-100', text: 'text-neutral-700' };
  return (
    <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
      <Text className={`text-xs font-semibold ${s.text}`}>{status || '—'}</Text>
    </View>
  );
}
