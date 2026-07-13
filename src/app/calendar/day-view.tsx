import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import ErrorState from '@/components/ErrorState';
import { useDayAvailability, useToggleBlock } from '@/hooks/useCalendar';
import { useBookingsByDate } from '@/hooks/useBookings';
import { BANDS, BAND_LABELS, BAND_TIME_LABELS, type Band, type BandState } from '@/api/calendar';

const STATE_META: Record<BandState, { label: string; chip: string; text: string }> = {
  available: { label: '空き', chip: 'bg-green-100', text: 'text-green-800' },
  booked: { label: '予約済', chip: 'bg-amber-100', text: 'text-amber-800' },
  blocked: { label: 'ブロック中', chip: 'bg-red-100', text: 'text-red-700' },
};

// Local-time date shift (avoids the toISOString UTC off-by-one).
function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

// Day schedule — a per-day timeline of the platform's 4 time bands (午前/午後/
// 夕方/夜間) with each band's state, plus the day's bookings. Band state + block/
// unblock come from availability.php / block-slot.php (the real endpoints); there
// is no finer-grained scheduling in the backend, so bands ARE the timeline.
export default function DayViewScreen() {
  const params = useLocalSearchParams<{ date?: string; bookingId?: string; name?: string; ref?: string }>();
  const router = useRouter();
  const [date, setDate] = useState(String(params.date ?? ''));
  const ctxName = String(params.name ?? '');

  const avail = useDayAvailability(date);
  const toggle = useToggleBlock(date);
  const bookings = useBookingsByDate(date);

  function onToggle(band: Band, state: BandState) {
    if (state === 'booked' || toggle.isPending) return;
    toggle.mutate(
      { band, block: state === 'available' },
      { onError: (e) => Alert.alert('エラー', e instanceof Error ? e.message : '更新に失敗しました') },
    );
  }

  if (!date) {
    return (
      <Screen title="日程" onBack={() => router.back()}>
        <ErrorState message="日付が指定されていません" />
      </Screen>
    );
  }

  return (
    <Screen title="日程スケジュール" onBack={() => router.back()}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => setDate(addDays(date, -1))}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 active:opacity-70"
          >
            <Text className="text-brand">‹ 前日</Text>
          </Pressable>
          <Text className="text-base font-bold text-brand">{date}</Text>
          <Pressable
            onPress={() => setDate(addDays(date, 1))}
            className="px-3 py-1.5 rounded-lg bg-neutral-100 active:opacity-70"
          >
            <Text className="text-brand">翌日 ›</Text>
          </Pressable>
        </View>

        {ctxName ? (
          <View className="mb-3 px-3 py-2 rounded-xl bg-brand-cream border border-neutral-200">
            <Text className="text-xs text-neutral-600">
              予約 <Text className="font-semibold text-brand">{ctxName}</Text> の日程を調整しています
            </Text>
          </View>
        ) : null}

        <Text className="text-sm font-bold text-brand mb-2">時間帯スケジュール</Text>
        {avail.isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        ) : avail.isError ? (
          <ErrorState message={(avail.error as Error)?.message} onRetry={() => avail.refetch()} />
        ) : (
          <View className="gap-y-2">
            {BANDS.map((band) => {
              const state = avail.data?.[band] ?? 'available';
              const meta = STATE_META[state];
              const actionable = state !== 'booked';
              return (
                <View
                  key={band}
                  className="flex-row bg-white border border-neutral-200 rounded-xl overflow-hidden"
                >
                  <View className="w-28 bg-neutral-50 px-3 py-3 border-r border-neutral-100 justify-center">
                    <Text className="text-sm font-semibold text-neutral-800">{BAND_LABELS[band]}</Text>
                    <Text className="text-[11px] text-neutral-400 mt-0.5">{BAND_TIME_LABELS[band]}</Text>
                  </View>
                  <View className="flex-1 px-3 py-3 flex-row items-center justify-between">
                    <View className={`px-2.5 py-1 rounded-full ${meta.chip}`}>
                      <Text className={`text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
                    </View>
                    {actionable ? (
                      <Pressable
                        onPress={() => onToggle(band, state)}
                        disabled={toggle.isPending}
                        className={`px-3 py-1.5 rounded-lg border active:opacity-70 ${
                          state === 'blocked'
                            ? 'border-neutral-300 bg-neutral-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            state === 'blocked' ? 'text-neutral-700' : 'text-red-700'
                          }`}
                        >
                          {state === 'blocked' ? '解除' : 'ブロック'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text className="text-xs text-neutral-400">予約済</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {toggle.isPending ? (
              <View className="flex-row items-center gap-x-2 mt-1">
                <ActivityIndicator size="small" />
                <Text className="text-xs text-neutral-500">更新中…</Text>
              </View>
            ) : null}
          </View>
        )}

        <Text className="text-sm font-bold text-brand mt-6 mb-2">
          この日の予約 {bookings.data ? `(${bookings.data.length})` : ''}
        </Text>
        {bookings.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : bookings.isError ? (
          <ErrorState message={(bookings.error as Error)?.message} onRetry={() => bookings.refetch()} />
        ) : bookings.data && bookings.data.length > 0 ? (
          <View className="gap-y-2">
            {bookings.data.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => router.push(`/booking/${b.id}` as Href)}
                className="bg-white border border-neutral-200 rounded-xl p-3 active:opacity-70"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-brand flex-1 pr-2" numberOfLines={1}>
                    {b.customer_name || '（名前なし）'}
                  </Text>
                  <Text className="text-xs text-neutral-500">{b.status || '—'}</Text>
                </View>
                {b.customer_phone ? (
                  <Text className="text-xs text-neutral-500 mt-0.5">{b.customer_phone}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="text-neutral-400 text-sm">この日の予約はありません</Text>
        )}
      </ScrollView>
    </Screen>
  );
}
