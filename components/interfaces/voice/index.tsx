import * as React from 'react';
import { useEffect } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useSpeakingParticipants,
} from '@livekit/react-native';
import { Room, Track } from 'livekit-client';
import useAxios from 'axios-hooks'
import useFetch from './fetch';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { Button } from 'react-native';

registerGlobals();

type AudioTrackerProps = {
  setUserAudioLevel: React.Dispatch<React.SetStateAction<number>>
  setAgentAudioLevel: React.Dispatch<React.SetStateAction<number>>
}

const AudioTracker: React.FC<AudioTrackerProps> = ({ setUserAudioLevel, setAgentAudioLevel }) => {
  const participants = useSpeakingParticipants()

  useEffect(() => {
    console.log(participants)

    const agent = participants.find((speaker) => speaker.isAgent)
    const user = participants.find((speaker) => !speaker.isAgent)

    setUserAudioLevel(user?.audioLevel ?? 0)
    setAgentAudioLevel(agent?.audioLevel ?? 0)
  }, [participants])

  return <></>
}

export const VoiceInterface: React.FC<AudioTrackerProps & { session: Session }> = ({ session, setUserAudioLevel, setAgentAudioLevel }) => {
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
    getCountries();
  }, []);

  async function getCountries() {
    const { data } = await supabase.from("user_profiles").select('*').eq('id', session.user.id)
    console.log('data')
    console.log(data)
  }

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
      <Button 
        title={connected ? 'End Chat' : 'Start Chat'} 
        onPress={() => setConnected(!connected)}  
      />
      <LiveKitRoom
        serverUrl={wsURL}
        token={token}
        connect={token && connected}
        audio={true}
      >
        <AudioTracker setUserAudioLevel={setUserAudioLevel} setAgentAudioLevel={setAgentAudioLevel} />
      </LiveKitRoom>
    </>
  );
};