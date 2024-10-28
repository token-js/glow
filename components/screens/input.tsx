import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';

type Props = {
  onSend: (msg: string) => void;
};

export const ChatInput: React.FC<Props> = ({ onSend }) => {
  const [message, setMessage] = useState('');
  const textInputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (message.trim().length > 0) {
      onSend(message.trim());
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
        placeholder="iMessage"
        placeholderTextColor="#8E8E93"
        value={message}
        onChangeText={setMessage}
        blurOnSubmit={false}
        returnKeyType="send"
        onSubmitEditing={handleSend}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
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
});

export default ChatInput;
