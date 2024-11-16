import React, { useState } from "react";

import { signupStyles, theme } from "@/lib/style";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  setName: React.Dispatch<React.SetStateAction<string>>;
  name: string;
  onNext: () => void;
};

export const NameSection: React.FC<Props> = ({ setName, name, onNext }) => {
  const [isFocused, setIsFocused] = useState(false);

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
          What's your name?
        </Text>
        <TextInput
          style={[
            theme.input,
            isFocused && theme.inputFocused, // Apply focus style conditionally
          ]}
          placeholder="Type your name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessible={true}
          accessibilityLabel="Name Input"
        />
      </View>
      <TouchableOpacity
        style={signupStyles.confirmButton}
        onPress={onNext}
        accessible={true}
        disabled={!name}
        accessibilityLabel="Confirm"
      >
        <Text style={signupStyles.confirmButtonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
};
