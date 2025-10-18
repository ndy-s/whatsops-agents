import { openDB } from "./db.js";

export async function getOrCreateChat(chatId, userId) {
  const db = await openDB();

  const chat = await db.sql`SELECT * FROM chats WHERE chat_id=${chatId}`;
  if (chat.length > 0) return chat[0];

  await db.sql`
    INSERT INTO chats (chat_id, user_id) VALUES (${chatId}, ${userId});
  `;

  const [newChat] = await db.sql`
    SELECT * FROM chats WHERE chat_id=${chatId}
    ORDER BY id DESC
    LIMIT 1
  `;

  return newChat;
}

export async function insertChatMessage({
  chatDbId,
  role,
  content,
  messageLength,
  truncatedMemory = [],
  retryCount = 0,
}) {
  const db = await openDB();

  await db.sql`
    INSERT INTO chat_messages (
      chat_id, role, content, message_length, truncated_memory, retry_count
    ) VALUES (
      ${chatDbId}, ${role}, ${content}, ${messageLength}, ${JSON.stringify(truncatedMemory)}, ${retryCount}
    );
  `;

  const [message] = await db.sql`
    SELECT * FROM chat_messages
    WHERE chat_id=${chatDbId}
    ORDER BY id DESC
    LIMIT 1
  `;

  return message.id;
}

export async function insertModelResponse({
  messageId,
  modelName,
  messageIdFromModel,
  promptTokens,
  completionTokens,
  totalTokens,
  validationType,
  validationErrors,
  metadata = {},
}) {
  const db = await openDB();

  await db.sql`
    INSERT INTO model_responses (
      message_id, model_name, message_id_from_model,
      prompt_tokens, completion_tokens, total_tokens,
      validation_type, validation_errors, metadata
    ) VALUES (
      ${messageId}, ${modelName}, ${messageIdFromModel},
      ${promptTokens}, ${completionTokens}, ${totalTokens},
      ${validationType}, ${validationErrors}, ${JSON.stringify(metadata)}
    );
  `;

  const [response] = await db.sql`
    SELECT * FROM model_responses
    WHERE message_id=${messageId}
    ORDER BY id DESC
    LIMIT 1
  `;

  return response.id;
}


