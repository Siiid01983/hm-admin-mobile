import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listChatThreads,
  listMessages,
  sendText,
  sendImage,
  uploadChatImage,
  type ChatAttachment,
} from '@/api/chat';

// Conversation list — polled (matches the web's polling model; no sockets).
export function useChatThreads() {
  return useQuery({
    queryKey: ['chatThreads'],
    queryFn: () => listChatThreads(),
    refetchInterval: 8000,
  });
}

// One room's messages — polled every 5s for a "realtime feel".
export function useChatMessages(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['chatMessages', bookingId],
    queryFn: () => listMessages(bookingId as string),
    enabled: !!bookingId,
    refetchInterval: 5000,
  });
}

interface SendInput {
  text?: string;
  images?: { uri: string; name: string; mime: string }[];
}

export function useSendChat(
  bookingId: string | undefined,
  ctx: { ref: string; customerEmail: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendInput) => {
      if (!bookingId) throw new Error('booking未指定');
      const sendCtx = { bookingId, ref: ctx.ref, customerEmail: ctx.customerEmail };
      if (input.images && input.images.length) {
        const uploaded: ChatAttachment[] = [];
        for (const img of input.images) uploaded.push(await uploadChatImage(bookingId, img));
        await sendImage(sendCtx, uploaded, input.text);
      } else if (input.text && input.text.trim()) {
        await sendText(sendCtx, input.text.trim());
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatMessages', bookingId] });
      qc.invalidateQueries({ queryKey: ['chatThreads'] });
    },
  });
}
