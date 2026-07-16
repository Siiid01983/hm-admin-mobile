import { View, Text, Image } from 'react-native';
import StatusBadge from '@/components/StatusBadge';
import type { Booking } from '@/api/types';

// Read-only booking summary for the top of the chat room. Pure presentation —
// no actions (BookingRequestBar owns Approve/Reject). Route / time / items are
// read from the packed `notes` block (from:/to:/time:) that the web booking form
// writes, with the dedicated `items` column preferred when present.

function packed(notes: string | null | undefined, key: string): string {
  const m = String(notes ?? '').match(new RegExp('^' + key + ':\\s*(.+)$', 'm'));
  return m ? m[1].trim() : '';
}

function itemList(items: unknown, notes: string | null | undefined): string[] {
  if (Array.isArray(items)) return items.map((x) => String(x)).filter(Boolean);
  if (typeof items === 'string' && items.trim()) {
    try {
      const a = JSON.parse(items);
      if (Array.isArray(a)) return a.map((x) => String(x)).filter(Boolean);
    } catch {
      /* not JSON — fall through to the notes fallback */
    }
  }
  const fromNotes = packed(notes, 'items');
  return fromNotes ? fromNotes.split(/[・,|]/).map((s) => s.trim()).filter(Boolean) : [];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row py-1">
      <Text className="w-16 text-xs text-neutral-500">{label}</Text>
      <Text className="flex-1 text-sm text-neutral-900">{value || '—'}</Text>
    </View>
  );
}

export default function BookingSummaryCard({
  booking,
  photos,
}: {
  booking: Booking;
  /** Optional real photo URLs; when omitted, placeholder slots are shown. */
  photos?: string[];
}) {
  const date = (booking.booking_date || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || booking.booking_date || '未定';
  const from = packed(booking.notes, 'from');
  const to = packed(booking.notes, 'to');
  const time = packed(booking.notes, 'time');
  const route = to ? `${from || '—'} → ${to}` : from || '—';
  const items = itemList(booking.items, booking.notes);
  const photoCount = photos?.length ?? 0;

  return (
    <View className="mx-3 my-2 bg-white border border-neutral-200 rounded-2xl p-4">
      {/* Customer + status */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="flex-1 mr-2 text-base font-bold text-brand" numberOfLines={1}>
          {booking.customer_name || '（お客様）'}
        </Text>
        <StatusBadge status={booking.status} />
      </View>

      <InfoRow label="ルート" value={route} />
      <InfoRow label="希望日" value={date} />
      {time ? <InfoRow label="時間" value={time} /> : null}
      {booking.customer_phone ? <InfoRow label="電話" value={booking.customer_phone} /> : null}

      {/* Items */}
      <View className="flex-row py-1">
        <Text className="w-16 text-xs text-neutral-500">荷物</Text>
        <View className="flex-1 flex-row flex-wrap gap-1">
          {items.length ? (
            items.map((it, i) => (
              <View key={i} className="bg-brand-cream border border-brand-sage rounded-full px-2 py-0.5">
                <Text className="text-xs text-brand">{it}</Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-neutral-400">—</Text>
          )}
        </View>
      </View>

      {/* Photos — real thumbnails when provided, else placeholder slots */}
      <View className="flex-row py-1 items-start">
        <Text className="w-16 text-xs text-neutral-500">写真</Text>
        <View className="flex-1 flex-row flex-wrap gap-2">
          {photoCount > 0
            ? photos!.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  className="w-14 h-14 rounded-lg bg-neutral-100 border border-neutral-200"
                />
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  className="w-14 h-14 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 items-center justify-center"
                >
                  <Text className="text-neutral-300 text-lg">＋</Text>
                </View>
              ))}
        </View>
      </View>
    </View>
  );
}
