import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useDayAvailability } from '@/hooks/useCalendar';
import { BANDS, BAND_LABELS, BAND_TIME_LABELS, type Band } from '@/api/calendar';

// Bottom-sheet band picker used when confirming / rescheduling a booking. Shows
// each band's live availability for the date; booked / blocked bands are
// disabled so the admin can only pick a free slot.
export default function BandPickerModal({
  date,
  title,
  busy,
  onPick,
  onClose,
}: {
  date: string;
  title: string;
  busy?: boolean;
  onPick: (band: Band) => void;
  onClose: () => void;
}) {
  const avail = useDayAvailability(date);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View className="bg-white rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-lg font-bold text-brand">{title}</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-neutral-400 text-lg">✕</Text>
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 mb-3">{date}　空いている時間帯を選択</Text>

          {avail.isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="gap-y-2">
              {BANDS.map((band) => {
                const state = avail.data?.[band] ?? 'available';
                const disabled = state !== 'available' || !!busy;
                const stateLabel =
                  state === 'available' ? '空き' : state === 'blocked' ? 'ブロック中' : '予約済';
                return (
                  <Pressable
                    key={band}
                    disabled={disabled}
                    onPress={() => onPick(band)}
                    className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                      disabled
                        ? 'bg-neutral-50 border-neutral-200 opacity-60'
                        : 'bg-white border-brand active:opacity-70'
                    }`}
                  >
                    <View>
                      <Text className="text-sm font-semibold text-neutral-800">{BAND_LABELS[band]}</Text>
                      <Text className="text-[11px] text-neutral-400">{BAND_TIME_LABELS[band]}</Text>
                    </View>
                    <Text
                      className={`text-xs font-medium ${
                        state === 'available' ? 'text-green-700' : 'text-neutral-400'
                      }`}
                    >
                      {stateLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {busy ? (
            <View className="flex-row items-center gap-x-2 mt-3">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-neutral-500">処理中…</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
