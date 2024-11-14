import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { signupStyles, theme } from '../../../lib/style';

type Props = {
  setAIName: React.Dispatch<React.SetStateAction<string>>
  aiName: string
  onFinish: () => Promise<void>;
}

export const AINameSection: React.FC<Props> = ({ setAIName, aiName, onFinish }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={signupStyles.sectionContent}>
      <View />
      <View style={signupStyles.sectionMainContent}>
      <Text style={theme.title}>Customize your assistant's name.</Text>
        <TextInput
          style={[
            theme.input,
            isFocused && theme.inputFocused
          ]}
          placeholder="Type your assistants name"
          placeholderTextColor="#888"
          value={aiName}
          onChangeText={setAIName}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessible={true}
          accessibilityLabel="Assistant Name Input"
        />
      </View>
      <TouchableOpacity
          style={signupStyles.confirmButton}
          onPress={onFinish}
          accessible={true}
          disabled={!aiName}
          accessibilityLabel="Confirm"
        >
          <Text style={signupStyles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
    </View>
  )
}