import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import type { Booking } from '@/api/types';

// In-chat "Booking Request" action bar. Rendered right below the conversation
// when the room's booking is still PENDING — a one-tap Approve / Reject without
// leaving the chat. (The room maps to exactly one booking, so this is driven by
// that booking's status rather than fragile per-message text parsing.)
export default function BookingRequestBar({
  booking,
  busy,
  onApprove,
  onReject,
}: {
  booking: Booking;
  busy?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View className="mx-3 my-2 bg-brand-cream border border-brand-sage rounded-2xl p-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-brand">📋 予約リクエスト</Text>
        <Text className="text-[11px] text-neutral-500" numberOfLines={1}>
          {booking.booking_date || '日付未定'}
        </Text>
      </View>

      <View className="flex-row gap-x-2">
        <Pressable
          onPress={onApprove}
          disabled={busy}
          className="flex-1 bg-brand rounded-xl py-2.5 items-center active:opacity-80"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-sm">承認</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={busy}
          className="flex-1 bg-red-50 border border-red-200 rounded-xl py-2.5 items-center active:opacity-80"
        >
          <Text className="text-red-700 font-semibold text-sm">却下</Text>
        </Pressable>
      </View>
    </View>
  );
}
