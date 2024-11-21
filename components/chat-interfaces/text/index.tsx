// components/chat-screen.tsx
import { TypingIndicator } from "@/components/typing-indicator";
import { Message, useChat } from "@/hooks/useChat";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/types/supabase";
import { QueryData, Session } from "@supabase/supabase-js";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

type Props = {
  session: Session;
  userId: string;
};

// Define the handle type for methods exposed via ref
export type ChatInterfaceHandle = {
  sendMessage: (message: string) => void;
  fetchListRef: () => React.RefObject<FlatList<any>>;
};

// Updated LoadingChatInterface component
export const LoadingChatInterface = forwardRef<ChatInterfaceHandle, Props>(
  ({ session, userId }, ref) => {
    const [chat, setChat] =
      useState<Database["public"]["Tables"]["chats"]["Row"]>();
    const [initialMessages, setInitialMessages] = useState<Message[]>([]);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
      getChat();
    }, []);

    async function getChat() {
      const chatQuery = supabase
        .from("chats")
        .select(`*`)
        .eq("user_id", userId);
      type ChatsWithMessages = QueryData<typeof chatQuery>;
      const { data, error } = await chatQuery;

      if (error) throw error;
      const chatsWithMessages: ChatsWithMessages = data;
      const chat = chatsWithMessages.at(-1);
      setChat(chat);

      const messagesQuery = supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chat?.id!)
        .order("created", {
          ascending: false,
        })
        .limit(1000);

      const { data: messages, error: messageQueryError } = await messagesQuery;
      if (messageQueryError) throw messageQueryError;

      setInitialMessages(messages.reverse());
    }

    if (!chat) {
      return <></>;
    } else {
      return (
        <ChatInterface
          ref={ref}
          flatListRef={flatListRef}
          initialMessages={initialMessages}
          session={session}
          chatId={chat.id}
        />
      );
    }
  }
);

type ChatInterfaceProps = Omit<Props, "userId"> & {
  flatListRef: React.RefObject<FlatList<any>>;
  initialMessages: Message[];
  chatId: string;
};

// Updated ChatInterface component
export const ChatInterface = forwardRef<
  ChatInterfaceHandle,
  ChatInterfaceProps
>(({ flatListRef, initialMessages, session, chatId }, ref) => {
  const {
    messages: chatMessages,
    isStreaming,
    sendMessage,
  } = useChat({
    initialMessages,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    chatId,
  });

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  }, [chatMessages.length]);

  // Expose sendMessage via ref
  useImperativeHandle(ref, () => ({
    sendMessage,
    fetchListRef: () => flatListRef,
  }));

  const renderItem = ({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.role === "user" ? styles.userMessage : styles.botMessage,
        ]}
      >
        {item.content.length > 0 ? (
          <Text style={styles.messageText}>{item.content}</Text>
        ) : (
          <TypingIndicator />
        )}
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={[...chatMessages].reverse()}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.messagesList}
      inverted
      keyboardShouldPersistTaps="handled"
      style={{
        width: "100%",
        height: "100%",
        flex: 1,
        overflow: "scroll",
      }}
    />
  );
});

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    width: "100%",
  },
  circleContainer: {
    marginTop: 50,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "#ECECEC",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  typingContainer: {
    marginVertical: 5,
    alignSelf: "flex-start",
  },
});
