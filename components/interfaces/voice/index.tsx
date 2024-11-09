import * as React from 'react';
import { useEffect } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useConnectionState,
  useRemoteParticipant,
  useRoomContext,
} from '@livekit/react-native';
import { ConnectionState, ParticipantKind } from 'livekit-client';
import useAxios, { RefetchFunction } from 'axios-hooks'
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Button, View } from 'react-native';

registerGlobals();

const RoomConnected = ({ setConnected, connected }: { setConnected: React.Dispatch<React.SetStateAction<boolean>>, connected: boolean }) => {
  return (<Button 
    title={'End Chat'} 
    onPress={() => setConnected(!connected)}  
  />)
}

const RoomDisconnected = ({ setConnected, connected }: { setConnected: React.Dispatch<React.SetStateAction<boolean>>, connected: boolean }) => {
  return (
    <Button 
      title={'Start Chat'} 
      onPress={() => setConnected(!connected)}  
    />
  )
}

const RoomConnecting = () => {
  return (<ActivityIndicator />)
}

const RoomStatus = ({ 
  connected, 
  setConnected,
  refetchToken
}: { 
  connected: boolean,
  setConnected: React.Dispatch<React.SetStateAction<boolean>>,
  refetchToken: RefetchFunction<any, any> 
}) => {  
  const room = useRoomContext()
  const [agentPreviouslyConnected, setAgentPreviouslyConnected] = React.useState<boolean>(false)
  const remote = useRemoteParticipant({
    kind: ParticipantKind.AGENT,
  })

  const agentConnected = !!remote

  useEffect(() => {
    // If call connected and agent connected and first time this is true, then record that the agent connected at least once
    if (connected && agentConnected && !agentPreviouslyConnected) {
      setAgentPreviouslyConnected(true)
    }

    // If the agent was previously connected and the call is connected, but there is no longer an agent connected then trigger
    // the room to be destroyed and recreated (which will cause a new agent to be connected)
    if (agentPreviouslyConnected && connected && !agentConnected) {
      refetchToken()
    }
  }, [agentConnected, connected])

  return (
    <>
      <View style={{
        marginBottom: 0
      }}>
        {connected && agentConnected === false ? <ActivityIndicator /> : <Button 
          title={'End Chat'} 
          onPress={() => setConnected(!connected)}  
        />}
      </View>
    </>
  )
}

export const VoiceInterface: React.FC<{ session: Session }> = ({ session }) => {
  const [connected, setConnected] = React.useState<boolean>(false)
  const wsURL = process.env.EXPO_PUBLIC_LIVEKIT_URL
  const [{ data: token, loading, error }, refetch] = useAxios(
    { 
      url: `${process.env.EXPO_PUBLIC_AUTH_SERVER_URL}/api/generateToken`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      }
    },
  )

  useEffect(() => {
    if (loading) {
      return
    }

    let start = async () => {
      await AudioSession.startAudioSession();
    };

    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, [loading]);

  if (loading || token === null) {
    return <></>
  }

  return (
    <View>
      {!connected && <Button 
        title={'Start Chat'} 
        onPress={() => setConnected(!connected)}  
      />}
      {connected && <LiveKitRoom
        serverUrl={wsURL}
        token={token}
        connect={token && connected}
        audio={true}
      >
        <RoomStatus connected={connected} setConnected={setConnected} refetchToken={refetch} />
      </LiveKitRoom>}
    </View>
  );
};