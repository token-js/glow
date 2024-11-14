// useChat.ts
import { useState, useCallback, useEffect } from 'react';
import uuid from 'react-native-uuid';
import { Database } from '../lib/types/supabase';

type Role = 'user' | 'assistant';

export type Message = Database['public']['Tables']['chat_messages']['Row'];

interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
}

type ChatOpts = {
  initialMessages?: Message[]
  headers?: HeadersInit
  body?: Record<string, any>
  chatId: string
}

export const useChat = ({
  initialMessages,
  headers,
  body,
  chatId
}: ChatOpts): UseChatReturn => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [messages, setMessages] = useState<Message[]>(initialMessages !== undefined ? initialMessages : []);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: uuid.v4().toString(),
      role: 'user',
      content: text,
      created: new Date().toString(),
      modified: new Date().toString(),
      chat_id: chatId
    };

    // Add the user's message to the conversation
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Prepare to receive the AI's response
    const aiMessage: Message = {
      id: uuid.v4().toString(),
      role: 'assistant',
      content: '',
      created: new Date().toString(),
      modified: new Date().toString(),
      chat_id: chatId
    };

    setMessages((prevMessages) => [...prevMessages, aiMessage]);
    setIsStreaming(true);

    try {
      const responseMessages = [...messages, userMessage]
      const baseUrl = process.env.EXPO_PUBLIC_API_URL
      const pyAPI = `https://${baseUrl}/api/chat`
      const response: Response = await fetch(pyAPI, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: responseMessages, chat_id: chatId, timezone, ...body,  }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader: ReadableStreamDefaultReader<string> | null = response.body
        ?.pipeThrough(new TextDecoderStream())
        .getReader() || null;

      if (!reader) {
        throw new Error('Failed to get reader from response body.');
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage.role === 'assistant') {
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
    } catch (error) {
      console.error('Error reading stream:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  return { messages, isStreaming, sendMessage };
};
