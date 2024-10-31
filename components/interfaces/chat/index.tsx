// components/chat-screen.tsx
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TypingIndicator } from '../../typing-indicator';

export type Message = {
  id: string;
  text: string;
  sender?: 'user' | 'bot';
  type: 'normal' | 'typing';
};

type Props = {
  flatListRef: React.RefObject<FlatList<any>>
  messages: Message[]
}

export const ChatInterface: React.FC<Props> = ({ flatListRef, messages }) => {
  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === 'typing') {
      return (
        <View style={styles.typingContainer}>
          <TypingIndicator />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  // Scroll to bottom when messages change
  useLayoutEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    width: '100%'
  },
  circleContainer: {
    marginTop: 50,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#ECECEC',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  typingContainer: {
    marginVertical: 5,
    alignSelf: 'flex-start',
  },
});
