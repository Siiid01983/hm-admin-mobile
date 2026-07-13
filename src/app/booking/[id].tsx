import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Screen from '@/components/Screen';
import AdminCard from '@/components/AdminCard';
import ErrorState from '@/components/ErrorState';
import StatusBadge from '@/components/StatusBadge';
import BandPickerModal from '@/components/BandPickerModal';
import QuickEditBookingModal from '@/components/QuickEditBookingModal';
import { useBooking, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useReserveSlot, useReleaseSlot } from '@/hooks/useSlots';
import { SlotConflictError } from '@/api/slots';
import { isPending, STATUS_APPROVE, STATUS_REJECT } from '@/api/bookings';
import type { Band } from '@/api/calendar';

// The human reference (HM-…) is stored inside booking.notes as "ref:<code>".
function refFromNotes(notes: string | null): string {
  if (!notes) return '';
  const m = notes.match(/ref:(\S+)/i);
  return m ? m[1] : '';
}

// Booking detail — full record + the Curama action set:
//   Approve → reserve the chosen band slot (collision-checked) + mark 確定
//   Reject  → release the slot + mark キャンセル
//   Edit    → Quick Edit (date / band reschedule / notes)
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBooking(id);

  const statusMut = useUpdateBookingStatus();
  const reserveMut = useReserveSlot();
  const releaseMut = useReleaseSlot();
  const [approving, setApproving] = useState(false);
  const [editing, setEditing] = useState(false);

  const busy = statusMut.isPending || reserveMut.isPending || releaseMut.isPending;
  const dstr = data ? (data.booking_date || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '' : '';

  function confirmWithBand(band: Band) {
    if (!data) return;
    reserveMut.mutate(
      { bookingId: data.id, date: dstr, band },
      {
        onSuccess: () =>
          statusMut.mutate(
            { id: data.id, status: STATUS_APPROVE },
            { onSettled: () => setApproving(false) },
          ),
        onError: (e) => {
          if (e instanceof SlotConflictError) {
            Alert.alert('Time Slot Occupied', 'Please release the slot first.\nこの時間帯は既に予約されています。');
          } else {
            Alert.alert('エラー', e instanceof Error ? e.message : '予約に失敗しました');
          }
        },
      },
    );
  }

  function onApprove() {
    if (!dstr) {
      Alert.alert('日付が必要', '「編集」から予約日を設定してから承認してください。');
      return;
    }
    setApproving(true);
  }

  function onReject() {
    if (!data || busy) return;
    statusMut.mutate(
      { id: data.id, status: STATUS_REJECT },
      {
        onSuccess: () => releaseMut.mutate(data.id),
        onError: (e) => Alert.alert('更新失敗', e instanceof Error ? e.message : '更新に失敗しました'),
      },
    );
  }

  return (
    <Screen
      title="予約詳細"
      onBack={() => router.back()}
      headerRight={
        data ? (
          <Pressable
            onPress={() =>
              router.push(
                (`/chat/${data.id}?ref=${encodeURIComponent(refFromNotes(data.notes))}` +
                  `&name=${encodeURIComponent(data.customer_name || '')}` +
                  `&email=${encodeURIComponent(data.customer_email || '')}`) as Href,
              )
            }
            className="px-3 py-1.5 rounded-lg bg-neutral-100 active:opacity-70"
          >
            <Text className="text-xs font-medium text-brand">💬 チャット</Text>
          </Pressable>
        ) : undefined
      }
    >
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

          <Text className="text-xs font-semibold text-neutral-600 mt-4 mb-2">操作</Text>

          {isPending(data.status) ? (
            <View className="flex-row gap-x-2 mb-2">
              <Pressable
                onPress={onApprove}
                disabled={busy}
                className="flex-1 bg-brand rounded-xl py-3.5 items-center active:opacity-80"
              >
                {reserveMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">承認</Text>
                )}
              </Pressable>
              <Pressable
                onPress={onReject}
                disabled={busy}
                className="flex-1 bg-red-50 border border-red-200 rounded-xl py-3.5 items-center active:opacity-80"
              >
                <Text className="text-red-700 font-semibold">却下</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={() => setEditing(true)}
            disabled={busy}
            className="bg-neutral-100 rounded-xl py-3.5 items-center active:opacity-70"
          >
            <Text className="text-neutral-700 font-semibold">✏️ 編集（日程・時間帯・メモ）</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (!dstr) {
                Alert.alert('日付なし', 'この予約には日付が設定されていません。');
                return;
              }
              router.push(
                (`/calendar/day-view?date=${dstr}&bookingId=${data.id}` +
                  `&name=${encodeURIComponent(data.customer_name || '')}` +
                  `&ref=${encodeURIComponent(refFromNotes(data.notes))}`) as Href,
              );
            }}
            className="mt-2 bg-white border border-neutral-200 rounded-xl py-3 items-center active:opacity-70"
          >
            <Text className="text-brand font-medium">📅 その日のスケジュール</Text>
          </Pressable>

          {busy ? (
            <View className="mt-3 flex-row items-center gap-x-2">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-neutral-500">更新中…</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {approving && data ? (
        <BandPickerModal
          date={dstr}
          title="承認：時間帯を選択"
          busy={reserveMut.isPending || statusMut.isPending}
          onPick={confirmWithBand}
          onClose={() => setApproving(false)}
        />
      ) : null}

      {editing && data ? (
        <QuickEditBookingModal booking={data} onClose={() => setEditing(false)} />
      ) : null}
    </Screen>
  );
}
