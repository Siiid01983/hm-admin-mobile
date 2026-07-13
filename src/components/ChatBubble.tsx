import { View, Text } from 'react-native';
import ChatImage from './ChatImage';
import type { ChatMessage } from '@/api/chat';

function fmtTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.indexOf('T') > 0 ? iso : iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

const isImage = (mime: string) => /^image\//.test(mime || '');

// In the ADMIN app, we (company/outbound) are "me" → right + brand green.
// The customer is "them" → left + white bubble.
export default function ChatBubble({ msg }: { msg: ChatMessage }) {
  const me = msg.senderType === 'company';

  if (msg.deleted) {
    return (
      <View className={`px-3 my-1 ${me ? 'items-end' : 'items-start'}`}>
        <View className="px-3 py-2 rounded-2xl bg-neutral-100">
          <Text className="text-xs text-neutral-400 italic">メッセージを削除しました</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`px-3 my-1 ${me ? 'items-end' : 'items-start'}`}>
      {!me ? (
        <Text className="text-[11px] text-neutral-400 mb-0.5 ml-1">{msg.senderName || 'お客様'}</Text>
      ) : null}

      {msg.text ? (
        <View
          className={`px-3.5 py-2 rounded-2xl max-w-[80%] ${
            me ? 'bg-brand' : 'bg-white border border-neutral-200'
          }`}
        >
          <Text className={me ? 'text-white text-[15px]' : 'text-neutral-800 text-[15px]'}>
            {msg.text}
          </Text>
        </View>
      ) : null}

      {msg.attachments.map((a) => (
        <View key={a.path} className="mt-1">
          {isImage(a.mime) ? (
            <ChatImage path={a.path} />
          ) : (
            <View className="px-3 py-2 rounded-xl bg-white border border-neutral-200">
              <Text className="text-xs text-neutral-700">📎 {a.name}</Text>
            </View>
          )}
        </View>
      ))}

      <Text className="text-[10px] text-neutral-400 mt-0.5 mx-1">{fmtTime(msg.createdAt)}</Text>
    </View>
  );
}
