import * as React from 'react';
import { useEffect } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useRemoteParticipant,
} from '@livekit/react-native';
import { ParticipantKind } from 'livekit-client';
import useAxios from 'axios-hooks'
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

const RoomStatus = ({ connected, setConnected }: { connected: boolean, setConnected: React.Dispatch<React.SetStateAction<boolean>> }) => {
  const local = useLocalParticipant()
  const remote = useRemoteParticipant({
    kind: ParticipantKind.AGENT,
  })

  const agentConnected = !!remote

  const fetchConnectionStatus = () => {
    if (agentConnected) {
      return 'connected'
    } else if (!connected) {
      return 'disconnected'
    } else {
      return 'connecting'
    }
  }

  const status: 'disconnected' | 'connecting' | 'connected' = fetchConnectionStatus()
  
  const fetchRoomStatus = () => {
    if (status === 'connected') {
      return <RoomConnected connected={connected} setConnected={setConnected} />
    } else if (status === 'connecting') {
      return <RoomConnecting />
    } else if (status === 'disconnected') {
      return <RoomDisconnected connected={connected} setConnected={setConnected} />
    }
  }

  return (
    <>
      <View style={{
        marginBottom: 0
      }}>
        {fetchRoomStatus()}
      </View>
    </>
  )
}

export const VoiceInterface: React.FC<{ session: Session }> = ({ session }) => {
  const [connected, setConnected] = React.useState<boolean>(false)
  const wsURL = process.env.EXPO_PUBLIC_LIVEKIT_URL
  const [{ data: token, loading, error }] = useAxios(
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
    <>
      <LiveKitRoom
        serverUrl={wsURL}
        token={token}
        connect={token && connected}
        audio={true}
      >
        <RoomStatus connected={connected} setConnected={setConnected} />
      </LiveKitRoom>
    </>
  );
};