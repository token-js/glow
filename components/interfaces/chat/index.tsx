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

type Message = {
  id: string;
  text: string;
  sender?: 'user' | 'bot';
  type: 'normal' | 'typing';
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (inputText.trim() === '') {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      type: 'normal',
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Add typing indicator
    const typingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '',
      type: 'typing',
    };

    setMessages((prevMessages) => [...prevMessages, typingMessage]);

    // Simulate bot response
    setTimeout(() => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.type === 'typing' ? { ...msg, text: 'This is a hardcoded response from the bot.', sender: 'bot', type: 'normal' } : msg
        )
      );
    }, 1500); // Simulate delay
    // Adjusted delay to 1500ms for better user experience

    setInputText('');
    Keyboard.dismiss();
  };

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
