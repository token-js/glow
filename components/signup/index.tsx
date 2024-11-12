import React, { useState, useRef, ReactElement, useEffect } from 'react';
import {
  View,
  Animated,
  Easing,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Settings } from '@prisma/client';
import { VoiceNameMapping, VoiceSelector } from './voice';
import { NameSection } from './name'
import { GenderSection } from './gender'
import { signupStyles, theme } from '../../lib/style';
import { convertSQLToSettings } from '../../lib/utils'
import { AINameSection } from './aiName';

export interface StepProps {
  onNext: () => void;
  name: string;
  setName: (name: string) => void;
  gender: string;
  setGender: (gender: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
}

export interface Step {
  key: string;
  component: () => ReactElement;
}

export type StepRenderProps = StepProps;

type Props = {
  session: Session
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
}

export const SignupFlow: React.FC<Props> = ({ session, setSettings }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [topSection, setTopSection] = useState<'A' | 'B'>('A')

  const flipTopSection = () => {
    if (topSection === 'A') {
      setTopSection('B')
    } else {
      setTopSection('A')
    }
  }

  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [voice, setVoice] = useState<string>('');
  const [aiName, setAIName] = useState<string>('');

  const outgoingAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const incomingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    outgoingAnim.setValue(1);
    incomingAnim.setValue(0);
  }, [topSection])

  const onNext = (): void => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    Animated.parallel([
      Animated.timing(outgoingAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(incomingAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ]).start(() => {
      setCurrentStepIndex((prevIndex) => prevIndex + 1);
      setIsTransitioning(false);
      flipTopSection()
    });
  }

  const onFinish = async (): Promise<void> => {
    const { error, data } = await supabase
      .from('settings')
      .update({ name: name, gender: gender.toLowerCase(), voice: VoiceNameMapping[voice as keyof typeof VoiceNameMapping], agent_name: aiName })
      .eq('id', session.user.id)
      .select()    

    const settings = convertSQLToSettings(data)

    if (error === null) {
      Animated.parallel([
        Animated.timing(outgoingAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(async () => {
        setSettings(settings)
      });
    } else {
      console.error(error)
    }
  };

  const steps: Step[] = [
    {
      key: 'name',
      component: () => <NameSection name={name} setName={setName} onNext={onNext} />
    },
    {
      key: 'gender',
      component: () => <GenderSection name={name} gender={gender} setGender={setGender} onNext={onNext} />
    },
    {
      key: 'voice',
      component: () => <VoiceSelector voice={voice} setVoice={setVoice} setAIName={setAIName} onNext={onNext} />
    },
    {
      key: 'aiName',
      component: () => <AINameSection aiName={aiName} setAIName={setAIName} onFinish={onFinish} />
    },
  ];

  const [parentHeight, setParentHeight] = useState(0);

  const onParentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setParentHeight(height);
  };

  const incomingY = incomingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [parentHeight, 0],
    extrapolate: 'clamp',
  });

  const outgoingY = outgoingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-parentHeight, 0],
    extrapolate: 'clamp',
  });

  const renderSectionA = () => {
    const opacity = topSection === 'A' ? outgoingAnim : incomingAnim
    const translate = topSection === 'A' ? outgoingY : incomingY
    const shouldShow = topSection === 'A' || (topSection === 'B' && currentStepIndex + 1 < steps.length)
    const stepDataIndex = topSection === 'A' ? currentStepIndex : currentStepIndex + 1

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            signupStyles.signupSection,
            {
              opacity,
              transform: [
                {
                  translateY: translate
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].component()}
        </Animated.View>
      )
    } else {
      return <></>
    }
  }

  const renderSectionB = () => {
    const opacity = topSection === 'B' ? outgoingAnim : incomingAnim
    const translate = topSection === 'B' ? outgoingY : incomingY
    const shouldShow = topSection === 'B' || (topSection === 'A' && currentStepIndex + 1 < steps.length)
    const stepDataIndex = topSection === 'B' ? currentStepIndex : currentStepIndex + 1

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            signupStyles.signupSection,
            {
              opacity,
              transform: [
                {
                  translateY: translate
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].component()}
        </Animated.View>
      )
    } else {
      return <></>
    }
  }


  return (
    <View style={[signupStyles.container, {
      height: parentHeight * 2
    }]} onLayout={onParentLayout}>
      <>
        {renderSectionA()}
        {renderSectionB()}
      </>
    </View>
  );
};

