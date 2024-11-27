import { updateUserSettings } from "@/components/screens/auth";
import { segmentTrackFinishedSignup } from "@/lib/analytics";
import { signupStyles } from "@/lib/style";
import { $Enums, Settings } from "@prisma/client";
import { Session } from "@supabase/supabase-js";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { AINameSection } from "./aiName";
import { GenderSection } from "./gender";
import { NameSection } from "./name";
import { VoiceKey, VoiceSelector } from "./voice";

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
  session: Session;
  setShowSignupFlow: React.Dispatch<React.SetStateAction<boolean>>;
  setSettings: React.Dispatch<
    React.SetStateAction<
      | Settings
      | null
      | undefined
    >
  >;
};

export const SignupFlow: React.FC<Props> = ({
  session,
  setShowSignupFlow,
  setSettings,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [topSection, setTopSection] = useState<"A" | "B">("A");

  const flipTopSection = () => {
    if (topSection === "A") {
      setTopSection("B");
    } else {
      setTopSection("A");
    }
  };

  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [voice, setVoice] = useState<VoiceKey | null>(null);
  const [aiName, setAIName] = useState<string>("");

  const outgoingAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const incomingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    outgoingAnim.setValue(1);
    incomingAnim.setValue(0);
  }, [topSection]);

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
      }),
    ]).start(() => {
      setCurrentStepIndex((prevIndex) => prevIndex + 1);
      setIsTransitioning(false);
      flipTopSection();
    });
  };

  const onFinish = async (): Promise<void> => {
    if (voice === null) {
      throw Error(
        "Voice is not set when updating settings, this should never happen"
      );
    }

    const { settings, error } = await updateUserSettings(
      name,
      gender,
      voice,
      aiName,
      session.user.id
    );
    setSettings(settings);

    if (error === null) {
      Animated.parallel([
        Animated.timing(outgoingAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start(async () => {
        setShowSignupFlow(false);
        segmentTrackFinishedSignup();
      });
    } else {
      console.error(error);
    }
  };

  const steps: Step[] = [
    {
      key: "name",
      component: () => (
        <NameSection name={name} setName={setName} onNext={onNext} />
      ),
    },
    {
      key: "gender",
      component: () => (
        <GenderSection
          name={name}
          gender={gender}
          setGender={setGender}
          onNext={onNext}
        />
      ),
    },
    {
      key: "voice",
      component: () => (
        <VoiceSelector
          voice={voice}
          setVoice={setVoice}
          setAIName={setAIName}
          onNext={onNext}
        />
      ),
    },
    {
      key: "aiName",
      component: () => (
        <AINameSection
          aiName={aiName}
          setAIName={setAIName}
          onFinish={onFinish}
        />
      ),
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
    extrapolate: "clamp",
  });

  const outgoingY = outgoingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-parentHeight, 0],
    extrapolate: "clamp",
  });

  const renderSectionA = () => {
    const opacity = topSection === "A" ? outgoingAnim : incomingAnim;
    const translate = topSection === "A" ? outgoingY : incomingY;
    const shouldShow =
      topSection === "A" ||
      (topSection === "B" && currentStepIndex + 1 < steps.length);
    const stepDataIndex =
      topSection === "A" ? currentStepIndex : currentStepIndex + 1;

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            signupStyles.signupSection,
            {
              opacity,
              transform: [
                {
                  translateY: translate,
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].component()}
        </Animated.View>
      );
    } else {
      return <></>;
    }
  };

  const renderSectionB = () => {
    const opacity = topSection === "B" ? outgoingAnim : incomingAnim;
    const translate = topSection === "B" ? outgoingY : incomingY;
    const shouldShow =
      topSection === "B" ||
      (topSection === "A" && currentStepIndex + 1 < steps.length);
    const stepDataIndex =
      topSection === "B" ? currentStepIndex : currentStepIndex + 1;

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            signupStyles.signupSection,
            {
              opacity,
              transform: [
                {
                  translateY: translate,
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].component()}
        </Animated.View>
      );
    } else {
      return <></>;
    }
  };

  return (
    <View
      style={[
        signupStyles.container,
        {
          height: parentHeight * 2,
        },
      ]}
      onLayout={onParentLayout}
    >
      <>
        {renderSectionA()}
        {renderSectionB()}
      </>
    </View>
  );
};
