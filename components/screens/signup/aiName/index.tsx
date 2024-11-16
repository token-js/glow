import React, { useState } from "react";

import { signupStyles, theme } from "@/lib/style";
import {
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  setAIName: React.Dispatch<React.SetStateAction<string>>;
  aiName: string;
  onFinish: () => Promise<void>;
};

export const AINameInput: React.FC<
  Omit<Props, "onFinish"> & {
    textAlign?: TextStyle["textAlign"];
  }
> = ({ setAIName, aiName, textAlign }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      style={[theme.input, isFocused && theme.inputFocused, { textAlign }]}
      placeholder="Type your assistants name"
      placeholderTextColor="#888"
      value={aiName}
      onChangeText={setAIName}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessible={true}
      accessibilityLabel="Assistant Name Input"
      returnKeyType="none"
    />
  );
};

export const AINameSection: React.FC<Props> = ({
  setAIName,
  aiName,
  onFinish,
}) => {
  return (
    <View style={signupStyles.sectionContent}>
      <View />
      <View style={signupStyles.sectionMainContent}>
        <Text
          style={[
            theme.title,
            {
              marginBottom: 20,
            },
          ]}
        >
          Customize your assistant's name.
        </Text>
        <AINameInput setAIName={setAIName} aiName={aiName} textAlign="center" />
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
  );
};
