import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useDayAvailability } from '@/hooks/useCalendar';
import { BANDS, BAND_LABELS, BAND_TIME_LABELS, type Band } from '@/api/calendar';

// "Confirm Booking" sheet opened when a chat command is parsed. Pre-filled with
// the extracted date + band; shows live availability and warns IMMEDIATELY if
// the chosen band is already booked/blocked (before hitting the backend — the
// 409 is the backstop). Confirming calls back with the final band.
export default function ConfirmBookingModal({
  date,
  initialBand,
  customerName,
  busy,
  onConfirm,
  onClose,
}: {
  date: string;
  initialBand: Band | null;
  customerName: string;
  busy?: boolean;
  onConfirm: (band: Band) => void;
  onClose: () => void;
}) {
  const [band, setBand] = useState<Band | null>(initialBand);
  const avail = useDayAvailability(date);

  const state = band ? (avail.data?.[band] ?? 'available') : 'available';
  const occupied = band != null && state !== 'available';
  const canConfirm = band != null && !occupied && !busy;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View className="bg-white rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-lg font-bold text-brand">予約の確定</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-neutral-400 text-lg">✕</Text>
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 mb-4">
            {customerName || 'お客様'}　·　{date}
          </Text>

          <Text className="text-xs font-medium text-neutral-600 mb-2">時間帯</Text>
          <View className="flex-row gap-x-2">
            {BANDS.map((b) => {
              const st = avail.data?.[b] ?? 'available';
              const disabled = st !== 'available';
              const selected = band === b;
              return (
                <Pressable
                  key={b}
                  disabled={disabled}
                  onPress={() => setBand(b)}
                  className={`flex-1 rounded-lg border py-2.5 items-center ${
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
                    {BAND_LABELS[b]}
                  </Text>
                  <Text className={`text-[10px] mt-0.5 ${selected ? 'text-white' : 'text-neutral-400'}`}>
                    {BAND_TIME_LABELS[b]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {occupied ? (
            <Text className="text-xs text-red-600 mt-3">
              ⚠ この時間帯は既に{state === 'blocked' ? 'ブロック' : '予約'}されています。別の時間帯を選択してください。
            </Text>
          ) : band == null ? (
            <Text className="text-xs text-neutral-400 mt-3">時間帯を選択してください。</Text>
          ) : null}

          <Pressable
            onPress={() => band && onConfirm(band)}
            disabled={!canConfirm}
            className={`mt-5 rounded-xl py-3.5 items-center ${
              canConfirm ? 'bg-brand active:opacity-80' : 'bg-neutral-300'
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">この内容で予約を確定</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
