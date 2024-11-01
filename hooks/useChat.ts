// useChat.ts
import { useState, useCallback } from 'react';
import uuid from 'react-native-uuid';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: Role;
  timestamp: Date;
}

interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
}

type ChatOpts = {
  headers?: HeadersInit
  body?: Record<string, any>
}

export const useChat = ({
  headers,
  body
}: ChatOpts): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: uuid.v4().toString(),
      content: text,
      role: 'user',
      timestamp: new Date(),
    };

    // Add the user's message to the conversation
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Prepare to receive the AI's response
    const aiMessage: Message = {
      id: uuid.v4().toString(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, aiMessage]);
    setIsStreaming(true);

    try {
      // Send the user's message to the backend
      const response: Response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [...messages, userMessage], ...body }),
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
      // Optionally, update the AI's message with an error text
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage.role === 'assistant') {
          const updatedMessage: Message = {
            ...lastMessage,
            content: 'An error occurred while fetching the response.',
          };
          return [...prevMessages.slice(0, -1), updatedMessage];
        }
        return prevMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, sendMessage };
};
