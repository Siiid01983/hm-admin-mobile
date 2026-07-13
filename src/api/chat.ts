import { api } from './client';
import { API_BASE, API_KEY } from './config';
import { getToken } from '@/lib/session';
import type { ApiEnvelope } from './types';

// Admin ⇄ customer chat, mirroring the website's Inbox "Direct Chat" flow:
// every booking has ONE room = inbox_messages rows sharing thread_id
// 'chat:<bookingId>'. Reads/writes go through the SAME staff-authed rest.php
// seam the web admin uses; media rides storage.php's private `chat` bucket.
// There is NO Socket.io anywhere in the platform — realtime is polling.

export interface ChatAttachment {
  path: string;
  name: string;
  mime: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  senderType: 'customer' | 'company'; // company = admin/us
  senderName: string;
  text: string;
  attachments: ChatAttachment[];
  deleted: boolean;
  createdAt: string;
}

export interface ChatThread {
  bookingId: string;
  ref: string;
  customerName: string;
  customerEmail: string;
  lastText: string;
  lastAt: string;
}

// Subset of the inbox_messages columns we read.
interface InboxRow {
  id: string;
  sender?: string;
  sender_name?: string;
  email?: string;
  body?: string;
  body_text?: string;
  booking_id?: string;
  thread_id?: string;
  labels?: unknown;
  created_at?: string;
  received_at?: string;
}

interface Labels {
  outbound?: boolean;
  chat?: boolean;
  deleted?: boolean;
  ref?: string;
  attachments?: Array<{ path?: string; name?: string; mime?: string; size?: number }>;
}

// RFC4122-ish v4 (matches inbox.js _uuid usage; ids are CHAR(36)).
export function uuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parseLabels(raw: unknown): Labels {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Labels;
  try {
    return (JSON.parse(String(raw)) as Labels) || {};
  } catch {
    return {};
  }
}

function restError(body: ApiEnvelope<unknown> | undefined, fallback: string): string {
  const err = body?.error;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object' && err.message) return err.message;
  return fallback;
}

const PLACEHOLDER = /^\s*\[\d+件の添付ファイルを送信しました\]\s*$/;
const threadId = (bookingId: string) => 'chat:' + bookingId;

// Mirror chat.php's list mapping: sender_type from labels.outbound, drop the
// media-only placeholder text, collect attachment paths (signed on demand).
function rowToMessage(r: InboxRow): ChatMessage {
  const labels = parseLabels(r.labels);
  const outbound = !!labels.outbound;
  const deleted = !!labels.deleted;
  let text = r.body_text != null && r.body_text !== '' ? String(r.body_text) : String(r.body ?? '');
  const attachments: ChatAttachment[] = [];
  if (!deleted && Array.isArray(labels.attachments)) {
    for (const a of labels.attachments) {
      if (a && a.path) {
        attachments.push({ path: String(a.path), name: String(a.name ?? 'file'), mime: String(a.mime ?? '') });
      }
    }
  }
  if (attachments.length && PLACEHOLDER.test(text)) text = '';
  return {
    id: String(r.id),
    senderType: outbound ? 'company' : 'customer',
    senderName: outbound
      ? String(r.sender_name ?? '') || 'Hello Moving'
      : String(r.sender_name ?? '') || String(r.sender ?? '') || 'お客様',
    text: deleted ? '' : text,
    attachments,
    deleted,
    createdAt: String(r.received_at ?? r.created_at ?? ''),
  };
}

// Conversation list: newest chat message per booking. rest.php `like` on
// thread_id 'chat:%' + desc order → first row seen per booking is the latest.
export async function listChatThreads(limit = 300): Promise<ChatThread[]> {
  const res = await api.post<ApiEnvelope<InboxRow[]>>('/rest.php', {
    table: 'inbox_messages',
    action: 'select',
    columns: '*',
    filters: [{ col: 'thread_id', op: 'like', val: 'chat:%' }],
    order: [{ col: 'created_at', ascending: false }],
    limit,
  });
  const body = res.data;
  if (!body?.ok) throw new Error(restError(body, 'チャットの取得に失敗しました'));
  const rows = Array.isArray(body.data) ? body.data : [];

  const threads = new Map<string, ChatThread>();
  for (const r of rows) {
    const bid = String(r.booking_id ?? '');
    if (!bid) continue;
    const labels = parseLabels(r.labels);
    const outbound = !!labels.outbound;
    let t = threads.get(bid);
    if (!t) {
      const m = rowToMessage(r); // latest
      t = {
        bookingId: bid,
        ref: String(labels.ref ?? ''),
        customerName: '',
        customerEmail: String(r.email ?? ''),
        lastText: m.deleted
          ? '（削除されたメッセージ）'
          : m.text || (m.attachments.length ? '📎 添付ファイル' : ''),
        lastAt: m.createdAt,
      };
      threads.set(bid, t);
    }
    // Customer identity comes from any inbound row (outbound rows say "Hello Moving").
    if (!t.customerName && !outbound && (r.sender_name || r.sender)) {
      t.customerName = String(r.sender_name ?? r.sender ?? '');
    }
    if (!t.customerEmail && r.email) t.customerEmail = String(r.email);
    if (!t.ref && labels.ref) t.ref = String(labels.ref);
  }
  return Array.from(threads.values());
}

// All messages in one booking's room, oldest → newest.
export async function listMessages(bookingId: string): Promise<ChatMessage[]> {
  const res = await api.post<ApiEnvelope<InboxRow[]>>('/rest.php', {
    table: 'inbox_messages',
    action: 'select',
    columns: '*',
    filters: [
      { col: 'booking_id', op: 'eq', val: bookingId },
      { col: 'thread_id', op: 'eq', val: threadId(bookingId) },
    ],
    order: [{ col: 'created_at', ascending: true }],
    limit: 500,
  });
  const body = res.data;
  if (!body?.ok) throw new Error(restError(body, 'メッセージの取得に失敗しました'));
  return (Array.isArray(body.data) ? body.data : []).map(rowToMessage);
}

interface SendCtx {
  bookingId: string;
  ref: string;
  customerEmail: string;
}

// Build the outbound inbox_messages row EXACTLY like inbox.js inboxSendChat.
function outboundRow(ctx: SendCtx, body: string, attachments?: ChatAttachment[]) {
  const labels: Labels = { outbound: true, chat: true, ref: ctx.ref };
  if (attachments && attachments.length) {
    labels.attachments = attachments.map((a) => ({
      path: a.path,
      name: a.name,
      mime: a.mime,
      size: a.size ?? 0,
    }));
  }
  return {
    id: uuid4(),
    sender: 'Hello Moving',
    sender_name: 'Hello Moving',
    email: ctx.customerEmail || '',
    subject: 'チャット' + (ctx.ref ? '（予約番号 ' + ctx.ref + '）' : ''),
    body,
    body_text: body,
    booking_id: ctx.bookingId,
    mailbox: 'contact@hello-moving.com',
    message_id: '<chat-' + uuid4() + '@hello-moving.com>',
    thread_id: threadId(ctx.bookingId),
    labels,
    is_read: 1,
    status: 'open',
  };
}

async function insertRow(row: ReturnType<typeof outboundRow>): Promise<void> {
  const res = await api.post<ApiEnvelope<unknown>>('/rest.php', {
    table: 'inbox_messages',
    action: 'insert',
    values: row,
  });
  if (!res.data?.ok) throw new Error(restError(res.data, '送信に失敗しました'));
}

export async function sendText(ctx: SendCtx, text: string): Promise<void> {
  await insertRow(outboundRow(ctx, text));
}

export async function sendImage(ctx: SendCtx, attachments: ChatAttachment[], text?: string): Promise<void> {
  const body = text && text.trim() ? text.trim() : `[${attachments.length}件の添付ファイルを送信しました]`;
  await insertRow(outboundRow(ctx, body, attachments));
}

// Upload one image to storage.php's private `chat` bucket (multipart). Uses a
// raw fetch so React Native sets the multipart boundary (our axios instance
// defaults to application/json). Returns the stored attachment metadata.
export async function uploadChatImage(
  bookingId: string,
  file: { uri: string; name: string; mime: string },
): Promise<ChatAttachment> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${bookingId}/${safeName}`;

  const form = new FormData();
  form.append('bucket', 'chat');
  form.append('path', path);
  // React Native's FormData file shape:
  form.append('file', { uri: file.uri, name: safeName, type: file.mime } as unknown as Blob);

  const token = await getToken();
  const res = await fetch(`${API_BASE}/storage.php?action=upload`, {
    method: 'POST',
    headers: {
      'X-API-KEY': API_KEY,
      ...(token ? { 'X-ADMIN-TOKEN': token } : {}),
    },
    body: form,
  });
  const json = (await res.json().catch(() => null)) as ApiEnvelope<{ path: string; size: number; mime: string }> | null;
  if (!json?.ok || !json.data) throw new Error(restError(json ?? undefined, '画像のアップロードに失敗しました'));
  return { path, name: file.name, mime: json.data.mime || file.mime, size: json.data.size };
}

// Short-lived signed read URL for a private `chat` file (storage.php sign).
export async function signChatUrl(path: string, ttl = 300): Promise<string> {
  const res = await api.get<ApiEnvelope<{ signedUrl: string }>>('/storage.php', {
    params: { action: 'sign', bucket: 'chat', path, ttl },
  });
  if (!res.data?.ok || !res.data.data?.signedUrl) {
    throw new Error(restError(res.data, '画像URLの取得に失敗しました'));
  }
  return res.data.data.signedUrl;
}
