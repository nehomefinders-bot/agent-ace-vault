import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  callGemini,
  deriveTitle,
  validateFolderId,
  validateFolderName,
  validateFolderRename,
  validateMoveSession,
  validateRename,
  validateSendInput,
  validateSessionId,
  type ChatTurn,
} from "./chat-assistant.server";

export const listChatSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // No pagination/limit: full history is always retrievable.
    const { data, error } = await context.supabase
      .from("chat_sessions")
      .select("id, title, folder_id, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listChatFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_folders")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createChatFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateFolderName)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_folders")
      .insert({ user_id: context.userId, name: data.name })
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renameChatFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateFolderRename)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_folders")
      .update({ name: data.name })
      .eq("id", data.folderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChatFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateFolderId)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_folders")
      .delete()
      .eq("id", data.folderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveChatSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateMoveSession)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_sessions")
      .update({ folder_id: data.folderId })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateSessionId)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteChatSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateSessionId)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_sessions")
      .delete()
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameChatSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateRename)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_sessions")
      .update({ title: data.title })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateSendInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let sessionId = data.sessionId;

    if (!sessionId) {
      const { data: created, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, title: deriveTitle(data.message) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      sessionId = created.id;
    }

    const { data: prior, error: priorErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (priorErr) throw new Error(priorErr.message);

    const history: ChatTurn[] = [
      ...((prior ?? []) as ChatTurn[]),
      { role: "user", content: data.message },
    ];

    const { data: userRow, error: userErr } = await supabase
      .from("chat_messages")
      .insert({ session_id: sessionId, user_id: userId, role: "user", content: data.message })
      .select("id, role, content, created_at")
      .single();
    if (userErr) throw new Error(userErr.message);

    const { reply, error: geminiError } = await callGemini(history);

    const { data: modelRow, error: modelErr } = await supabase
      .from("chat_messages")
      .insert({ session_id: sessionId, user_id: userId, role: "model", content: reply })
      .select("id, role, content, created_at")
      .single();
    if (modelErr) throw new Error(modelErr.message);

    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return { sessionId, userMessage: userRow, assistantMessage: modelRow, reply, error: geminiError };
  });
