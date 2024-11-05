// components/chat-input.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatInterfaceHandle } from '../interfaces/chat'; // Adjust the path as necessary

type Props = {
  chatRef: React.MutableRefObject<ChatInterfaceHandle | null>;
};

export const ChatInput: React.FC<Props> = ({ chatRef }) => {
  const [message, setMessage] = useState('');
  const textInputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (message.trim().length > 0) {
      chatRef.current?.sendMessage(message.trim());
      setMessage('');
      // Keep the keyboard open
      textInputRef.current?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={textInputRef}
        style={styles.textInput}
        placeholder="Type a message"
        placeholderTextColor="#8E8E93"
        value={message}
        onChangeText={setMessage}
        blurOnSubmit={false}
        returnKeyType="send"
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
        <Ionicons name="send" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
    height: 50
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
    fontSize: 16,
    color: '#000000',
    backgroundColor: 'transparent',
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
});
