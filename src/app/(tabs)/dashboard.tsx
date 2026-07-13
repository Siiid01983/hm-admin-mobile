import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import MonthCalendar from '@/components/MonthCalendar';
import { useBookingsByDate } from '@/hooks/useBookings';
import { useDayAvailability, useToggleBlock } from '@/hooks/useCalendar';
import { isPending, isConfirmed } from '@/api/bookings';
import { BANDS, BAND_LABELS, BAND_TIME_LABELS, type Band, type BandState } from '@/api/calendar';
import type { Booking } from '@/api/types';

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BAND_STATE_META: Record<BandState, { label: string; chip: string; text: string }> = {
  available: { label: '空き', chip: 'bg-green-100', text: 'text-green-800' },
  booked: { label: '予約済み', chip: 'bg-amber-100', text: 'text-amber-800' },
  blocked: { label: 'ブロック中', chip: 'bg-red-100', text: 'text-red-700' },
};

// Date-First Command Center (Curama-style): a calendar anchors the whole screen;
// below it the 4 time-band cards and the day's bookings all follow the selected
// date. Booking cards open the detail view where Approve / Reject / Edit live.
export default function DashboardScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [refreshing, setRefreshing] = useState(false);

  const avail = useDayAvailability(date);
  const toggle = useToggleBlock(date);
  const bookings = useBookingsByDate(date);

  const all = bookings.data ?? [];
  const pending = all.filter((b) => isPending(b.status));
  const confirmed = all.filter((b) => isConfirmed(b.status));

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([avail.refetch(), bookings.refetch()]);
    setRefreshing(false);
  }

  function onBand(band: Band, state: BandState) {
    if (state === 'booked' || toggle.isPending) return;
    toggle.mutate(
      { band, block: state === 'available' },
      { onError: (e) => Alert.alert('エラー', e instanceof Error ? e.message : '更新に失敗しました') },
    );
  }

  function bookingCard(b: Booking) {
    return (
      <Pressable
        key={b.id}
        onPress={() => router.push(`/booking/${b.id}` as Href)}
        className="bg-white border border-neutral-200 rounded-2xl p-4 mb-2.5 active:opacity-70"
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-brand flex-1 pr-2" numberOfLines={1}>
            {b.customer_name || '（名前なし）'}
          </Text>
          <StatusBadge status={b.status} />
        </View>
        {b.customer_phone ? (
          <Text className="text-xs text-neutral-500 mt-1">{b.customer_phone}</Text>
        ) : null}
        <Text className="text-xs text-brand-sage mt-2">タップして対応 →</Text>
      </Pressable>
    );
  }

  return (
    <Screen title="ダッシュボード">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Date anchor ─────────────────────────────────────────────── */}
        <MonthCalendar selectedDate={date} onSelectDate={setDate} />

        {/* ── 4-band time schedule (cards) ────────────────────────────── */}
        <Text className="text-base font-bold text-brand mb-3 mt-6">時間帯スケジュール</Text>
        {avail.isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        ) : avail.isError ? (
          <ErrorState message={(avail.error as Error)?.message} onRetry={() => avail.refetch()} />
        ) : (
          <View className="gap-y-3">
            {BANDS.map((band) => {
              const state = avail.data?.[band] ?? 'available';
              const meta = BAND_STATE_META[state];
              const actionable = state !== 'booked';
              return (
                <View key={band} className="bg-white border border-neutral-200 rounded-2xl p-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-bold text-brand">{BAND_LABELS[band]}</Text>
                      <Text className="text-xs text-neutral-400 mt-0.5">{BAND_TIME_LABELS[band]}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${meta.chip}`}>
                      <Text className={`text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
                    </View>
                  </View>
                  {actionable ? (
                    <Pressable
                      onPress={() => onBand(band, state)}
                      disabled={toggle.isPending}
                      className={`mt-3 rounded-xl py-2.5 items-center border active:opacity-70 ${
                        state === 'blocked'
                          ? 'border-neutral-300 bg-neutral-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          state === 'blocked' ? 'text-neutral-700' : 'text-red-700'
                        }`}
                      >
                        {state === 'blocked' ? 'ブロック解除' : 'ブロックする'}
                      </Text>
                    </Pressable>
                  ) : (
                    <View className="mt-3 rounded-xl py-2.5 items-center bg-neutral-50">
                      <Text className="text-sm text-neutral-400">予約済み（操作不可）</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Pending requests for the day ────────────────────────────── */}
        <Text className="text-base font-bold text-brand mb-3 mt-8">
          承認待ち{pending.length ? `（${pending.length}）` : ''}
        </Text>
        {bookings.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : bookings.isError ? (
          <ErrorState message={(bookings.error as Error)?.message} onRetry={() => bookings.refetch()} />
        ) : pending.length === 0 ? (
          <Text className="text-neutral-400 text-sm">この日の承認待ちはありません</Text>
        ) : (
          pending.map(bookingCard)
        )}

        {/* ── Confirmed bookings for the day ──────────────────────────── */}
        <Text className="text-base font-bold text-brand mb-3 mt-8">
          確定予約{confirmed.length ? `（${confirmed.length}）` : ''}
        </Text>
        {bookings.isLoading ? null : confirmed.length === 0 ? (
          <Text className="text-neutral-400 text-sm">この日の確定予約はありません</Text>
        ) : (
          confirmed.map(bookingCard)
        )}
      </ScrollView>
    </Screen>
  );
}
