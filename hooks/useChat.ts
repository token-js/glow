// useChat.ts
import { Database } from "@/lib/types/supabase";
import * as FileSystem from "expo-file-system";
import { useCallback, useEffect, useState } from "react";
import uuid from "react-native-uuid";

type Role = "user" | "assistant";

export type Message = Database["public"]["Tables"]["chat_messages"]["Row"];

interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  audioIdToAutoplay: string | null;
}

type ChatOpts = {
  initialMessages?: Message[];
  headers?: HeadersInit;
  body?: Record<string, any>;
  chatId: string;
  audioMessagesEnabled: boolean;
};

export const useChat = ({
  initialMessages,
  audioMessagesEnabled,
  headers,
  body,
  chatId,
}: ChatOpts): UseChatReturn => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [messages, setMessages] = useState<Message[]>(
    initialMessages !== undefined ? initialMessages : []
  );
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [audioIdToAutoplay, setAudioIdToAutoplay] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      const userMessage: Message = {
        id: uuid.v4().toString(),
        role: "user",
        content: text,
        created: new Date().toString(),
        modified: new Date().toString(),
        chat_id: chatId,
        display_type: "text",
        audio_id: null,
      };

      // Add the user's message to the conversation
      setMessages((prevMessages) => [...prevMessages, userMessage]);

      // Prepare to receive the AI's response
      const aiMessage: Message = {
        id: uuid.v4().toString(),
        role: "assistant",
        content: "",
        created: new Date().toString(),
        modified: new Date().toString(),
        chat_id: chatId,
        audio_id: null,
        display_type: "text",
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setIsStreaming(true);

      try {
        const responseMessages = [...messages, userMessage];
        const baseUrl = process.env.EXPO_PUBLIC_API_URL;
        const pyAPI = `https://${baseUrl}/api/chat`;

        const response: Response = await fetch(pyAPI, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: responseMessages,
            chat_id: chatId,
            timezone,
            // We include the `audio_messages_enabled` here to ensure that the current value is used
            // to generate this message. Alternatively, we could read this field in the backend from
            // the `Settings` table, but that value isn't guaranteed to be up to date, particularly
            // if the user changed the setting in the UI then immediately sends a message.
            audio_messages_enabled: audioMessagesEnabled,
            ...body,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.startsWith("application/json")) {
          const data = await response.json();

          const textContent = data.text;
          const audioId = data.audioId;
          const audioBase64 = data.audioBase64;

          const fileUri = `${FileSystem.documentDirectory}${audioId}.mp3`;

          await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Update messages with text content and audioId
          setMessages((prevMessages) => {
            const updatedMessage: Message = {
              ...aiMessage,
              content: textContent,
              display_type: "audio",
              audio_id: audioId,
            };
            return [...prevMessages.slice(0, -1), updatedMessage];
          });

          setAudioIdToAutoplay(audioId);
        } else if (contentType.startsWith("text/")) {
          const reader: ReadableStreamDefaultReader<string> | null =
            response.body?.pipeThrough(new TextDecoderStream()).getReader() ||
            null;

          if (!reader) {
            throw new Error("Failed to get reader from response body.");
          }

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              setMessages((prevMessages) => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage.role === "assistant") {
                  // Update the AI's message with the new chunk of data
                  const updatedMessage: Message = {
                    ...lastMessage,
                    content: lastMessage.content + value,
                  };
                  return [...prevMessages.slice(0, -1), updatedMessage];
                }
                return prevMessages;
              });
            }
          }
        } else {
          throw new Error(`Unsupported Content-Type: ${contentType}`);
        }
      } catch (error) {
        console.error("Error reading response:", error);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, audioMessagesEnabled]
  );

  return { messages, isStreaming, sendMessage, audioIdToAutoplay };
};
