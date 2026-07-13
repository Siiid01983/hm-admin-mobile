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
import QuickEditBookingModal from '@/components/QuickEditBookingModal';
import BandPickerModal from '@/components/BandPickerModal';
import { useBookings, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useDayAvailability, useToggleBlock } from '@/hooks/useCalendar';
import { useReserveSlot, useReleaseSlot } from '@/hooks/useSlots';
import { SlotConflictError } from '@/api/slots';
import { isPending, isConfirmed, STATUS_APPROVE, STATUS_REJECT } from '@/api/bookings';
import { BANDS, BAND_LABELS, BAND_TIME_LABELS, type Band, type BandState } from '@/api/calendar';
import type { Booking } from '@/api/types';

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BAND_STATE_META: Record<BandState, { label: string; chip: string; text: string }> = {
  available: { label: '空き', chip: 'bg-green-100', text: 'text-green-800' },
  booked: { label: '予約済', chip: 'bg-amber-100', text: 'text-amber-800' },
  blocked: { label: 'ブロック中', chip: 'bg-red-100', text: 'text-red-700' },
};

// Command Center — a single-screen dashboard merging the three admin priorities:
//   1. Pending bookings → 承認 / 却下   (status write via rest.php)
//   2. Today's 4 band toggles → block / unblock (block-slot.php)
//   3. Today's confirmed bookings → Quick Edit (date/notes) modal
// Reuses the existing service/hook/component layer. No new navigation needed.
export default function DashboardScreen() {
  const router = useRouter();
  const today = todayIso();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [approving, setApproving] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bookings = useBookings();
  const avail = useDayAvailability(today);
  const toggle = useToggleBlock(today);
  const statusMut = useUpdateBookingStatus();
  const reserveMut = useReserveSlot();
  const releaseMut = useReleaseSlot();

  const dateOf = (b: Booking) => (b.booking_date || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || today;

  const all = bookings.data ?? [];
  const pending = all.filter((b) => isPending(b.status));
  const confirmedToday = all.filter(
    (b) => isConfirmed(b.status) && (b.booking_date || '').startsWith(today),
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([bookings.refetch(), avail.refetch()]);
    setRefreshing(false);
  }

  // Approve = reserve the chosen band slot (collision-checked), THEN mark 確定.
  function confirmWithBand(band: Band) {
    if (!approving) return;
    const b = approving;
    reserveMut.mutate(
      { bookingId: b.id, date: dateOf(b), band },
      {
        onSuccess: () =>
          statusMut.mutate(
            { id: b.id, status: STATUS_APPROVE },
            { onSettled: () => setApproving(null) },
          ),
        onError: (e) => {
          if (e instanceof SlotConflictError) {
            Alert.alert(
              '時間帯が予約済み',
              'Time Slot Occupied — この時間帯は既に予約されています。別の時間帯を選択してください。',
            );
          } else {
            Alert.alert('エラー', e instanceof Error ? e.message : '予約に失敗しました');
          }
        },
      },
    );
  }

  // Reject = mark キャンセル and free any slot the booking held.
  function reject(b: Booking) {
    if (statusMut.isPending) return;
    statusMut.mutate(
      { id: b.id, status: STATUS_REJECT },
      {
        onSuccess: () => releaseMut.mutate(b.id),
        onError: (e) => Alert.alert('更新失敗', e instanceof Error ? e.message : '更新に失敗しました'),
      },
    );
  }

  function onBand(band: Band, state: BandState) {
    if (state === 'booked' || toggle.isPending) return;
    toggle.mutate(
      { band, block: state === 'available' },
      { onError: (e) => Alert.alert('エラー', e instanceof Error ? e.message : '更新に失敗しました') },
    );
  }

  return (
    <Screen title="ダッシュボード">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Priority 1: Pending bookings ───────────────────────────── */}
        <Text className="text-sm font-bold text-brand mb-2">
          承認待ち{pending.length ? `（${pending.length}）` : ''}
        </Text>
        {bookings.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : bookings.isError ? (
          <ErrorState message={(bookings.error as Error)?.message} onRetry={() => bookings.refetch()} />
        ) : pending.length === 0 ? (
          <Text className="text-neutral-400 text-sm mb-2">承認待ちの予約はありません</Text>
        ) : (
          pending.map((b) => (
            <View key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-4 mb-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-brand flex-1 pr-2" numberOfLines={1}>
                  {b.customer_name || '（名前なし）'}
                </Text>
                <StatusBadge status={b.status} />
              </View>
              <Text className="text-xs text-neutral-500 mt-0.5">
                {b.booking_date || '—'}
                {b.customer_phone ? `　${b.customer_phone}` : ''}
              </Text>
              <View className="flex-row gap-x-2 mt-3">
                <Pressable
                  onPress={() => setApproving(b)}
                  disabled={statusMut.isPending || reserveMut.isPending}
                  className="flex-1 rounded-lg py-2.5 items-center bg-brand active:opacity-80"
                >
                  <Text className="text-white font-semibold text-sm">承認</Text>
                </Pressable>
                <Pressable
                  onPress={() => reject(b)}
                  disabled={statusMut.isPending || releaseMut.isPending}
                  className="flex-1 rounded-lg py-2.5 items-center bg-red-50 border border-red-200 active:opacity-80"
                >
                  <Text className="text-red-700 font-semibold text-sm">却下</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* ── Priority 2: Today's band toggles ───────────────────────── */}
        <Text className="text-sm font-bold text-brand mb-2 mt-6">
          本日の時間帯ブロック（{today}）
        </Text>
        {avail.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : avail.isError ? (
          <ErrorState message={(avail.error as Error)?.message} onRetry={() => avail.refetch()} />
        ) : (
          <View className="gap-y-2">
            {BANDS.map((band) => {
              const state = avail.data?.[band] ?? 'available';
              const meta = BAND_STATE_META[state];
              const actionable = state !== 'booked';
              return (
                <View
                  key={band}
                  className="flex-row items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3"
                >
                  <View>
                    <Text className="text-sm font-medium text-neutral-800">{BAND_LABELS[band]}</Text>
                    <Text className="text-[11px] text-neutral-400">{BAND_TIME_LABELS[band]}</Text>
                  </View>
                  <View className="flex-row items-center gap-x-2">
                    <View className={`px-2.5 py-1 rounded-full ${meta.chip}`}>
                      <Text className={`text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
                    </View>
                    {actionable ? (
                      <Pressable
                        onPress={() => onBand(band, state)}
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

        {/* ── Priority 3: Today's confirmed bookings ─────────────────── */}
        <Text className="text-sm font-bold text-brand mb-2 mt-6">
          本日の確定予約{confirmedToday.length ? `（${confirmedToday.length}）` : ''}
        </Text>
        {bookings.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        ) : confirmedToday.length === 0 ? (
          <Text className="text-neutral-400 text-sm">本日の確定予約はありません</Text>
        ) : (
          confirmedToday.map((b) => (
            <View key={b.id} className="bg-white border border-neutral-200 rounded-2xl p-4 mb-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-brand flex-1 pr-2" numberOfLines={1}>
                  {b.customer_name || '（名前なし）'}
                </Text>
                <StatusBadge status={b.status} />
              </View>
              {b.notes ? (
                <Text className="text-xs text-neutral-500 mt-1" numberOfLines={1}>
                  {b.notes}
                </Text>
              ) : null}
              <View className="flex-row gap-x-2 mt-3">
                <Pressable
                  onPress={() => setEditing(b)}
                  className="flex-1 rounded-lg py-2.5 items-center bg-neutral-100 active:opacity-70"
                >
                  <Text className="text-neutral-700 font-semibold text-sm">クイック編集</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/booking/${b.id}` as Href)}
                  className="px-4 rounded-lg py-2.5 items-center justify-center bg-neutral-100 active:opacity-70"
                >
                  <Text className="text-neutral-700 text-sm">詳細 →</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {editing ? (
        <QuickEditBookingModal booking={editing} onClose={() => setEditing(null)} />
      ) : null}

      {approving ? (
        <BandPickerModal
          date={dateOf(approving)}
          title="承認：時間帯を選択"
          busy={reserveMut.isPending || statusMut.isPending}
          onPick={confirmWithBand}
          onClose={() => setApproving(null)}
        />
      ) : null}
    </Screen>
  );
}
