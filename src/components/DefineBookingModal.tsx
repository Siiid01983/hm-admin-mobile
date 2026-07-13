import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';

const OPEN = 8 * 60; // 08:00
const CLOSE = 21 * 60; // 21:00
const STEP = 30; // minutes
const DURATIONS = [1, 2, 3, 4, 5, 6]; // hours

function fmt(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const p = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${p(h)}:${p(m)}`;
}

// "Define Booking" — Admin-Controlled Reservation. Editable start time (30-min
// steps within business hours), duration picker (1–6h, default 2h), auto end.
// Confirming hands back ISO start/end for an interval collision check.
export default function DefineBookingModal({
  date,
  defaultStartMinutes,
  customerName,
  busy,
  onConfirm,
  onClose,
}: {
  date: string; // YYYY-MM-DD
  defaultStartMinutes: number; // minutes from midnight
  customerName: string;
  busy?: boolean;
  onConfirm: (startIso: string, endIso: string) => void;
  onClose: () => void;
}) {
  function clampStart(m: number) {
    return Math.max(OPEN, Math.min(m, CLOSE - 60));
  }
  const [start, setStart] = useState(clampStart(defaultStartMinutes));
  const [durationH, setDurationH] = useState(2); // most common default

  const end = start + durationH * 60;
  const overHours = end > CLOSE;

  function step(delta: number) {
    setStart((s) => clampStart(s + delta));
  }
  function toIso(mins: number) {
    return `${date}T${fmt(mins)}:00`;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View className="bg-white rounded-t-3xl p-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-lg font-bold text-brand">予約枠を設定</Text>
            <Pressable onPress={onClose} className="px-2 py-1 active:opacity-60">
              <Text className="text-neutral-400 text-lg">✕</Text>
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 mb-4">
            {customerName || 'お客様'}　·　{date}
          </Text>

          {/* Start time */}
          <Text className="text-xs font-medium text-neutral-600 mb-1">開始時間</Text>
          <View className="flex-row items-center justify-between bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 mb-4">
            <Pressable
              onPress={() => step(-STEP)}
              className="w-11 h-11 rounded-lg bg-white border border-neutral-300 items-center justify-center active:opacity-70"
            >
              <Text className="text-brand text-lg">−30分</Text>
            </Pressable>
            <Text className="text-2xl font-bold text-brand">{fmt(start)}</Text>
            <Pressable
              onPress={() => step(STEP)}
              className="w-11 h-11 rounded-lg bg-white border border-neutral-300 items-center justify-center active:opacity-70"
            >
              <Text className="text-brand text-lg">+30分</Text>
            </Pressable>
          </View>

          {/* Duration */}
          <Text className="text-xs font-medium text-neutral-600 mb-1">所要時間</Text>
          <View className="flex-row gap-x-2 mb-4">
            {DURATIONS.map((h) => {
              const selected = durationH === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setDurationH(h)}
                  className={`flex-1 rounded-lg border py-2.5 items-center ${
                    selected ? 'bg-brand border-brand' : 'bg-white border-neutral-300 active:opacity-70'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-neutral-700'}`}>
                    {h}h
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* End (auto) */}
          <View className="flex-row items-center justify-between px-1 mb-1">
            <Text className="text-xs font-medium text-neutral-600">終了時間（自動）</Text>
            <Text className={`text-base font-bold ${overHours ? 'text-red-600' : 'text-neutral-800'}`}>
              {fmt(Math.min(end, 24 * 60))}
            </Text>
          </View>
          {overHours ? (
            <Text className="text-xs text-red-600 mb-1">営業時間（〜21:00）を超えています。</Text>
          ) : null}

          <Pressable
            onPress={() => !overHours && onConfirm(toIso(start), toIso(end))}
            disabled={overHours || busy}
            className={`mt-4 rounded-xl py-3.5 items-center ${
              overHours || busy ? 'bg-neutral-300' : 'bg-brand active:opacity-80'
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">
                {fmt(start)}〜{fmt(end)} で予約を確定
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
