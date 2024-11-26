import { segmentTrackEndChat, segmentTrackStartChat } from "@/lib/analytics";
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useRemoteParticipant,
} from "@livekit/react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import useAxios, { RefetchFunction } from "axios-hooks";
import { ParticipantKind } from "livekit-client";
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, Button, View } from "react-native";

registerGlobals();

const RoomStatus = ({
  connected,
  setConnected,
  refetchToken,
}: {
  connected: boolean;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
  refetchToken: RefetchFunction<any, any>;
}) => {
  const [agentPreviouslyConnected, setAgentPreviouslyConnected] =
    React.useState<boolean>(false);
  const remote = useRemoteParticipant({
    kind: ParticipantKind.AGENT,
  });

  const agentConnected = !!remote;

  useEffect(() => {
    if (connected && agentConnected && !agentPreviouslyConnected) {
      setAgentPreviouslyConnected(true);
    }

    if (agentPreviouslyConnected && connected && !agentConnected) {
      refetchToken();
    }
  }, [agentConnected, connected]);

  return (
    <View style={{ marginBottom: 0 }}>
      {connected && agentConnected === false ? (
        <ActivityIndicator />
      ) : (
        <Button
          title={"End Chat"}
          onPress={() => {
            setConnected(false);
            segmentTrackEndChat();
          }}
        />
      )}
    </View>
  );
};

export const VoiceInterface: React.FC<{ session: Session }> = ({ session }) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [connected, setConnected] = React.useState<boolean>(false);
  const wsURL = process.env.EXPO_PUBLIC_LIVEKIT_URL;
  const [{ data: token, loading, error }, refetch] = useAxios({
    url: `https://${process.env.EXPO_PUBLIC_API_URL}/api/generateToken`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    data: {
      timezone,
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (connected) {
          setConnected(false);
        }
      };
    }, [connected])
  );

  useEffect(() => {
    if (error !== null) {
      console.error(error);
      Alert.alert(
        "An error occurred while fetching access token, please report this to the developers.",
        error.message
      );
    }
  }, [error]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const startAudioSession = async () => {
      await AudioSession.startAudioSession();
    };

    startAudioSession();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, [loading]);

  if (loading || token === null) {
    return null;
  }

  return (
    <View>
      {!connected && (
        <Button
          title={"Start Chat"}
          onPress={() => {
            setConnected(true);
            segmentTrackStartChat();
          }}
        />
      )}
      {connected && (
        <LiveKitRoom
          serverUrl={wsURL}
          token={token}
          connect={connected}
          audio={true}
        >
          <RoomStatus
            connected={connected}
            setConnected={setConnected}
            refetchToken={refetch}
          />
        </LiveKitRoom>
      )}
    </View>
  );
};
