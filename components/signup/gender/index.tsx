import React, { useState, useRef, ReactElement, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { signupStyles, theme } from '../../../lib/style';

type Props = {
  name: string
  setGender: React.Dispatch<React.SetStateAction<string>>
  gender: string | null
  onNext: () => void;
}

export const GenderSection: React.FC<Props> = ({ name, setGender, gender, onNext }) => {
  const genders = ['Male', 'Female', 'Nonbinary'];

  const handleGenderSelect = async (selectedVoice: string) => {
    setGender(selectedVoice);
  };

  return (
    <View style={signupStyles.container}>
      <View style={signupStyles.sectionContent}>
        <View />
        <View style={signupStyles.sectionMainContent}>
          <Text style={theme.title}>Hi {name}, what's your gender?</Text>
          {genders.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                theme.button,
                gender === g && theme.selectedButton,
              ]}
              onPress={() => handleGenderSelect(g)}
              accessible={true}
              accessibilityLabel={`Select ${g}`}
            >
              <Text
                style={[
                  theme.buttonText,
                  gender === g && theme.selectedButtonText,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={signupStyles.confirmButton}
          onPress={onNext}
          accessible={true}
          disabled={!gender}
          accessibilityLabel="Confirm"
        >
          <Text style={signupStyles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>          
      </View>
    </View>
  )
}