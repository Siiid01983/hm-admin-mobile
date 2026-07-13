import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/components/Screen';
import AdminCard from '@/components/AdminCard';
import ErrorState from '@/components/ErrorState';
import StatusBadge, { BOOKING_STATUSES } from '@/components/StatusBadge';
import { useBooking, useUpdateBookingStatus } from '@/hooks/useBookings';

// Booking detail — full record + status transition actions. Reached by tapping a
// row in the bookings list. Status changes go through the react-query mutation,
// which refreshes both this screen and the list.
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBooking(id);
  const mutation = useUpdateBookingStatus();

  function onSetStatus(status: string) {
    if (!id || !data || data.status === status || mutation.isPending) return;
    mutation.mutate(
      { id, status },
      {
        onError: (e) =>
          Alert.alert('更新失敗', e instanceof Error ? e.message : '更新に失敗しました'),
      },
    );
  }

  return (
    <Screen title="予約詳細" onBack={() => router.back()}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-400">予約が見つかりません</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <AdminCard
            title={data.customer_name || '（名前なし）'}
            subtitle={data.booking_date || ''}
            right={<StatusBadge status={data.status} />}
          >
            <View className="mt-3 gap-y-1.5">
              {data.customer_phone ? (
                <Text className="text-sm text-neutral-700">📞 {data.customer_phone}</Text>
              ) : null}
              {data.customer_email ? (
                <Text className="text-sm text-neutral-700">✉️ {data.customer_email}</Text>
              ) : null}
              {data.service_id ? (
                <Text className="text-sm text-neutral-700">🏷 サービス: {data.service_id}</Text>
              ) : null}
              {data.notes ? (
                <Text className="text-sm text-neutral-700 mt-1">📝 {data.notes}</Text>
              ) : null}
            </View>
            <View className="mt-3 pt-3 border-t border-neutral-100 gap-y-0.5">
              <Text className="text-[11px] text-neutral-400">ID: {data.id}</Text>
              <Text className="text-[11px] text-neutral-400">作成: {data.created_at || '—'}</Text>
              <Text className="text-[11px] text-neutral-400">更新: {data.updated_at || '—'}</Text>
            </View>
          </AdminCard>

          <Text className="text-xs font-semibold text-neutral-600 mt-2 mb-2">
            ステータス変更
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {BOOKING_STATUSES.map((s) => {
              const active = data.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => onSetStatus(s)}
                  disabled={mutation.isPending || active}
                  className={`px-4 py-2 rounded-xl border active:opacity-80 ${
                    active ? 'bg-brand border-brand' : 'bg-white border-neutral-300'
                  }`}
                >
                  <Text className={active ? 'text-white font-semibold' : 'text-neutral-700'}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {mutation.isPending ? (
            <View className="mt-3 flex-row items-center gap-x-2">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-neutral-500">更新中…</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
