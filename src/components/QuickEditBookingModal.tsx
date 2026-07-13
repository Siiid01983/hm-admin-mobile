import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useUpdateBooking } from '@/hooks/useBookings';
import { useReserveSlot } from '@/hooks/useSlots';
import { useDayAvailability } from '@/hooks/useCalendar';
import { SlotConflictError } from '@/api/slots';
import { BANDS, BAND_LABELS, type Band } from '@/api/calendar';
import type { Booking } from '@/api/types';

// Quick Edit / Reschedule — update a booking's date, time band, and notes.
// Picking a band performs a proper RESCHEDULE (server atomically releases the
// old slot + reserves the new band + syncs the date); a taken band → 409
// "Time Slot Occupied". With no band picked, only date/notes are updated.
export default function QuickEditBookingModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const [dateVal, setDateVal] = useState(booking.booking_date || '');
  const [notesVal, setNotesVal] = useState(booking.notes || '');
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);

  const dateForAvail = dateVal.trim().match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
  const avail = useDayAvailability(dateForAvail || undefined);
  const updateMut = useUpdateBooking();
  const reserveMut = useReserveSlot();
  const busy = updateMut.isPending || reserveMut.isPending;

  function onErr(e: unknown) {
    Alert.alert('保存失敗', e instanceof Error ? e.message : '保存に失敗しました');
  }

  function save() {
    if (busy) return;
    const d = dateVal.trim();

    if (selectedBand) {
      // Reschedule: reserve the new band (frees the old slot + moves the date
      // atomically on the server), then persist the notes.
      reserveMut.mutate(
        { bookingId: booking.id, date: d.match(/\d{4}-\d{2}-\d{2}/)?.[0] || d, band: selectedBand },
        {
          onSuccess: () =>
            updateMut.mutate(
              { id: booking.id, patch: { notes: notesVal } },
              { onSuccess: onClose, onError: onErr },
            ),
          onError: (e) => {
            if (e instanceof SlotConflictError) {
              Alert.alert(
                '時間帯が予約済み',
                'Time Slot Occupied — この時間帯は既に予約されています。別の時間帯を選択してください。',
              );
            } else {
              onErr(e);
            }
          },
        },
      );
    } else {
      updateMut.mutate(
        { id: booking.id, patch: { booking_date: d, notes: notesVal } },
        { onSuccess: onClose, onError: onErr },
      );
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <View className="bg-white rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-brand">クイック編集</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-neutral-400 text-lg">✕</Text>
            </Pressable>
          </View>

          <Text className="text-xs text-neutral-500 mb-3">
            {booking.customer_name || '（名前なし）'}
            {booking.customer_phone ? `　${booking.customer_phone}` : ''}
          </Text>

          <Text className="text-xs font-medium text-neutral-600 mb-1">予約日</Text>
          <TextInput
            className="bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-3 text-base"
            value={dateVal}
            onChangeText={setDateVal}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />

          <Text className="text-xs font-medium text-neutral-600 mb-1 mt-3">
            時間帯（選択で予約枠を移動・空きのみ）
          </Text>
          <View className="flex-row gap-x-2">
            {BANDS.map((band) => {
              const state = avail.data?.[band] ?? 'available';
              const disabled = state !== 'available';
              const selected = selectedBand === band;
              return (
                <Pressable
                  key={band}
                  disabled={disabled}
                  onPress={() => setSelectedBand(selected ? null : band)}
                  className={`flex-1 rounded-lg border py-2 items-center ${
                    selected
                      ? 'bg-brand border-brand'
                      : disabled
                        ? 'bg-neutral-50 border-neutral-200 opacity-50'
                        : 'bg-white border-neutral-300 active:opacity-70'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-700'}`}
                  >
                    {BAND_LABELS[band]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-xs font-medium text-neutral-600 mb-1 mt-3">メモ</Text>
          <TextInput
            className="bg-neutral-50 border border-neutral-300 rounded-xl px-4 py-3 text-base h-24"
            value={notesVal}
            onChangeText={setNotesVal}
            multiline
            textAlignVertical="top"
            placeholder="メモ"
            placeholderTextColor="#9ca3af"
          />

          <View className="flex-row gap-x-3 mt-5">
            <Pressable
              onPress={onClose}
              className="flex-1 rounded-xl py-3.5 items-center bg-neutral-100 active:opacity-80"
            >
              <Text className="text-neutral-700 font-medium">キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={busy}
              className="flex-1 rounded-xl py-3.5 items-center bg-brand active:opacity-80"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">{selectedBand ? '再スケジュール' : '保存'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
