import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Screen from '@/components/Screen';
import MonthCalendar from '@/components/MonthCalendar';
import ErrorState from '@/components/ErrorState';
import { useDayAvailability, useToggleBlock } from '@/hooks/useCalendar';
import { BANDS, BAND_LABELS, type Band, type BandState } from '@/api/calendar';

function todayIso() {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const STATE_META: Record<BandState, { label: string; chip: string; text: string }> = {
  available: { label: '空き', chip: 'bg-green-100', text: 'text-green-800' },
  booked: { label: '予約済み', chip: 'bg-amber-100', text: 'text-amber-800' },
  blocked: { label: 'ブロック中', chip: 'bg-red-100', text: 'text-red-700' },
};

// Calendar tab — pick a day, see per-band availability, and block/unblock bands.
// Real customer bookings ('booked') are read-only; only admin blocks are toggled.
export default function CalendarScreen() {
  const [date, setDate] = useState(todayIso);
  const { data, isLoading, isError, error, refetch } = useDayAvailability(date);
  const toggle = useToggleBlock(date);

  function onToggle(band: Band, state: BandState) {
    if (state === 'booked' || toggle.isPending) return;
    toggle.mutate(
      { band, block: state === 'available' },
      {
        onError: (e) =>
          Alert.alert('エラー', e instanceof Error ? e.message : '更新に失敗しました'),
      },
    );
  }

  return (
    <Screen title="カレンダー">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <MonthCalendar selectedDate={date} onSelectDate={setDate} />

        <Text className="text-sm font-bold text-brand mt-5 mb-2">{date} の空き状況</Text>

        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : (
          <View className="gap-y-2">
            {BANDS.map((band) => {
              const state = data?.[band] ?? 'available';
              const meta = STATE_META[state];
              const actionable = state !== 'booked';
              return (
                <View
                  key={band}
                  className="flex-row items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3"
                >
                  <View className="flex-row items-center gap-x-3">
                    <Text className="text-sm font-medium text-neutral-800 w-10">
                      {BAND_LABELS[band]}
                    </Text>
                    <View className={`px-2.5 py-1 rounded-full ${meta.chip}`}>
                      <Text className={`text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
                    </View>
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
                    <Text className="text-xs text-neutral-400">操作不可</Text>
                  )}
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
      </ScrollView>
    </Screen>
  );
}
