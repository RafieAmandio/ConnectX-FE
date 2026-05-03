import * as SQLite from 'expo-sqlite';

import type { ChatConversation, ChatConversationKind, ChatMessage, ChatMessageStatus } from '../types/chat.types';

const CHAT_DATABASE_NAME = 'connectx-chat.db';
const LOCAL_MESSAGE_LIMIT = 30;

const seededConversations = [
  {
    id: 'conv_ardi_wijaya',
    kind: 'direct',
    name: 'Ardi Wijaya',
    participantEmail: 'ardi.wijaya@connectx.demo',
    photoUrl: 'https://i.pravatar.cc/512?img=12',
    unreadCount: 1,
  },
  {
    id: 'conv_maya_chen',
    kind: 'direct',
    name: 'Maya Chen',
    participantEmail: 'maya.chen@connectx.demo',
    photoUrl: 'https://i.pravatar.cc/512?img=32',
    unreadCount: 0,
  },
  {
    id: 'conv_ghi',
    kind: 'direct',
    name: 'Nina Patel',
    participantEmail: 'nina.patel@connectx.demo',
    photoUrl: 'https://i.pravatar.cc/512?img=5',
    unreadCount: 0,
  },
] as const satisfies readonly {
  id: string;
  kind: ChatConversationKind;
  name: string;
  participantEmail: string;
  photoUrl: string | null;
  unreadCount: number;
}[];

const seededMessages = [
  {
    id: 'ardi-1',
    conversationId: 'conv_ardi_wijaya',
    body: 'Your business development background looks like a strong fit for the CTO search.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-10T08:12:00.000Z',
  },
  {
    id: 'ardi-2',
    conversationId: 'conv_ardi_wijaya',
    body: 'Nice. I would love to compare notes on the MVP scope and technical risks.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-10T08:18:00.000Z',
  },
  {
    id: 'ardi-3',
    conversationId: 'conv_ardi_wijaya',
    body: 'Great. I can send the current product brief before we talk.',
    direction: 'outgoing',
    status: 'sent',
    createdAt: '2026-04-10T08:25:00.000Z',
  },
  {
    id: 'ardi-4',
    conversationId: 'conv_ardi_wijaya',
    body: 'Perfect. Send it over and I will mark the engineering assumptions.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-10T08:31:00.000Z',
  },
  {
    id: 'maya-1',
    conversationId: 'conv_maya_chen',
    body: 'Love the direction. Want to jump into a quick product strategy intro tomorrow?',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-11T07:42:00.000Z',
  },
  {
    id: 'maya-2',
    conversationId: 'conv_maya_chen',
    body: 'Yes. I can share the customer segment notes and the GTM questions.',
    direction: 'outgoing',
    status: 'sent',
    createdAt: '2026-04-11T07:49:00.000Z',
  },
  {
    id: 'maya-3',
    conversationId: 'conv_maya_chen',
    body: 'That would be helpful. I am especially curious about retention loops.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-11T08:03:00.000Z',
  },
  {
    id: 'nina-1',
    conversationId: 'conv_ghi',
    body: 'Your sales motion sounds close to what I have been testing for early SaaS teams.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-12T06:18:00.000Z',
  },
  {
    id: 'nina-2',
    conversationId: 'conv_ghi',
    body: 'That is exactly the gap. I need someone who can turn discovery into growth experiments.',
    direction: 'outgoing',
    status: 'sent',
    createdAt: '2026-04-12T06:26:00.000Z',
  },
  {
    id: 'nina-3',
    conversationId: 'conv_ghi',
    body: 'I can draft a first 30-day experiment map if you want to compare working styles.',
    direction: 'incoming',
    status: 'read',
    createdAt: '2026-04-12T06:40:00.000Z',
  },
] as const satisfies readonly ChatMessage[];

type ConversationRow = {
  id: string;
  kind: ChatConversationKind;
  messagesStored: number;
  name: string;
  participantEmail: string;
  photoUrl: string | null;
  previewText: string;
  unreadCount: number;
  updatedAt: string;
};

type MessageRow = {
  body: string;
  conversationId: string;
  createdAt: string;
  direction: ChatMessage['direction'];
  id: string;
  status: ChatMessageStatus;
};

type TableColumnRow = {
  name: string;
};

export type DiscoveryMatchConversationInput = {
  id: string;
  name: string;
  participantEmail?: string | null;
  photoUrl?: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createMessageId(conversationId: string) {
  return `${conversationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeConversationId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mapConversationRow(row: ConversationRow): ChatConversation {
  return {
    id: row.id,
    kind: row.kind,
    lastMessageAt: row.updatedAt,
    messagesStored: row.messagesStored,
    name: row.name,
    participantEmail: row.participantEmail,
    photoUrl: row.photoUrl,
    preview: row.previewText,
    unreadCount: row.unreadCount,
  };
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    body: row.body,
    conversationId: row.conversationId,
    createdAt: row.createdAt,
    direction: row.direction,
    id: row.id,
    status: row.status,
  };
}

async function pruneConversationMessages(
  database: SQLite.SQLiteDatabase,
  conversationId: string
) {
  await database.runAsync(
    `
      DELETE FROM messages
      WHERE conversation_id = ?
        AND id NOT IN (
          SELECT id
          FROM messages
          WHERE conversation_id = ?
          ORDER BY datetime(created_at) DESC
          LIMIT ?
        )
    `,
    conversationId,
    conversationId,
    LOCAL_MESSAGE_LIMIT
  );
}

async function seedMockChatData(database: SQLite.SQLiteDatabase) {
  const seededConversationIds = seededConversations.map((conversation) => conversation.id);
  const placeholders = seededConversationIds.map(() => '?').join(', ');
  const existingSeededConversations = await database.getAllAsync<{
    id: string;
    participantEmail: string | null;
  }>(
    `
      SELECT id, participant_email AS participantEmail
      FROM conversations
      WHERE id IN (${placeholders})
    `,
    ...seededConversationIds
  );

  const hasCurrentSeedData = seededConversations.every((conversation) =>
    existingSeededConversations.some(
      (existingConversation) =>
        existingConversation.id === conversation.id &&
        existingConversation.participantEmail === conversation.participantEmail
    )
  );

  if (hasCurrentSeedData) {
    return;
  }

  await database.execAsync(`
    DELETE FROM messages;
    DELETE FROM conversations;
  `);

  for (const conversation of seededConversations) {
    const conversationMessages = seededMessages
      .filter((message) => message.conversationId === conversation.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const lastMessage = conversationMessages.at(-1);

    await database.runAsync(
      `
        INSERT INTO conversations (
          id,
          name,
          kind,
          participant_email,
          photo_url,
          preview_text,
          unread_count,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      conversation.id,
      conversation.name,
      conversation.kind,
      conversation.participantEmail,
      conversation.photoUrl,
      lastMessage?.body ?? 'No messages yet',
      conversation.unreadCount,
      lastMessage?.createdAt ?? new Date().toISOString()
    );

    for (const message of conversationMessages) {
      await database.runAsync(
        `
          INSERT INTO messages (id, conversation_id, body, direction, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        message.id,
        message.conversationId,
        message.body,
        message.direction,
        message.status,
        message.createdAt
      );
    }

    await pruneConversationMessages(database, conversation.id);
  }
}

async function backfillSeededConversationPhotoUrls(database: SQLite.SQLiteDatabase) {
  for (const conversation of seededConversations) {
    await database.runAsync(
      `
        UPDATE conversations
        SET photo_url = ?
        WHERE id = ?
      `,
      conversation.photoUrl,
      conversation.id
    );
  }
}

async function ensureConversationColumns(database: SQLite.SQLiteDatabase) {
  const columns = await database.getAllAsync<TableColumnRow>('PRAGMA table_info(conversations)');
  const hasParticipantEmail = columns.some((column) => column.name === 'participant_email');
  const hasPhotoUrl = columns.some((column) => column.name === 'photo_url');

  if (!hasParticipantEmail) {
    await database.execAsync('ALTER TABLE conversations ADD COLUMN participant_email TEXT');
  }

  if (!hasPhotoUrl) {
    await database.execAsync('ALTER TABLE conversations ADD COLUMN photo_url TEXT');
  }
}

async function initializeDatabase() {
  const database = await SQLite.openDatabaseAsync(CHAT_DATABASE_NAME);

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      participant_email TEXT,
      photo_url TEXT,
      preview_text TEXT NOT NULL,
      unread_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      body TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
      ON messages (conversation_id, created_at DESC);
  `);

  await ensureConversationColumns(database);
  await seedMockChatData(database);
  await backfillSeededConversationPhotoUrls(database);

  return database;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = initializeDatabase();
  }

  return databasePromise;
}

export async function listMockConversations() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ConversationRow>(
    `
      SELECT
        conversations.id,
        conversations.name,
        conversations.kind,
        conversations.participant_email AS participantEmail,
        conversations.photo_url AS photoUrl,
        conversations.preview_text AS previewText,
        conversations.unread_count AS unreadCount,
        conversations.updated_at AS updatedAt,
        COUNT(messages.id) AS messagesStored
      FROM conversations
      LEFT JOIN messages ON messages.conversation_id = conversations.id
      GROUP BY conversations.id
      ORDER BY datetime(conversations.updated_at) DESC
    `
  );

  return rows.map(mapConversationRow);
}

export async function listMockMessages(conversationId: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<MessageRow>(
    `
      SELECT
        id,
        conversation_id AS conversationId,
        body,
        direction,
        status,
        created_at AS createdAt
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `,
    conversationId,
    LOCAL_MESSAGE_LIMIT
  );

  return rows.reverse().map(mapMessageRow);
}

export async function appendMockMessage(conversationId: string, body: string) {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error('Message body cannot be empty.');
  }

  const database = await getDatabase();
  const createdAt = new Date().toISOString();
  const nextMessage: ChatMessage = {
    body: trimmedBody,
    conversationId,
    createdAt,
    direction: 'outgoing',
    id: createMessageId(conversationId),
    status: 'sent',
  };

  await database.runAsync(
    `
      INSERT INTO messages (id, conversation_id, body, direction, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    nextMessage.id,
    nextMessage.conversationId,
    nextMessage.body,
    nextMessage.direction,
    nextMessage.status,
    nextMessage.createdAt
  );

  await database.runAsync(
    `
      UPDATE conversations
      SET preview_text = ?, unread_count = 0, updated_at = ?
      WHERE id = ?
    `,
    nextMessage.body,
    nextMessage.createdAt,
    conversationId
  );

  await pruneConversationMessages(database, conversationId);

  return nextMessage;
}

export async function upsertDiscoveryMatchConversation(input: DiscoveryMatchConversationInput) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const normalizedId = normalizeConversationId(input.id);
  const conversationId = `conv_match_${normalizedId || Date.now()}`;
  const participantEmail =
    input.participantEmail?.trim() || `${normalizedId || conversationId}@connectx.match`;
  const previewText = 'You matched on ConnectX. Say hi to start the conversation.';

  await database.runAsync(
    `
      INSERT INTO conversations (
        id,
        name,
        kind,
        participant_email,
        photo_url,
        preview_text,
        unread_count,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        participant_email = excluded.participant_email,
        photo_url = excluded.photo_url,
        preview_text = excluded.preview_text,
        unread_count = 0,
        updated_at = excluded.updated_at
    `,
    conversationId,
    input.name,
    'direct',
    participantEmail,
    input.photoUrl ?? null,
    previewText,
    0,
    now
  );

  return conversationId;
}

export async function resetMockChatData() {
  const database = await getDatabase();

  await database.execAsync(`
    DELETE FROM messages;
    DELETE FROM conversations;
  `);

  await seedMockChatData(database);
}

export { LOCAL_MESSAGE_LIMIT };
