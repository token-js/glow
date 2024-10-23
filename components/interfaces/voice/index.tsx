import * as React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItem,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useEffect } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  TrackReferenceOrPlaceholder,
  VideoTrack,
  isTrackReference,
  registerGlobals,
} from '@livekit/react-native';
import { Room, Track } from 'livekit-client';
import useAxios from 'axios-hooks'
import useFetch from './fetch';

registerGlobals();

export const VoiceInterface = ({ supabaseToken }: { supabaseToken: string }) => {
  console.log(supabaseToken)
  const wsURL = process.env.EXPO_PUBLIC_LIVEKIT_URL
  const [{ data: token, loading, error }, refetch] = useAxios(
    { 
      url: `${process.env.EXPO_PUBLIC_AUTH_SERVER_URL}/api/generateToken`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      }
    },
  )

  console.log(token)

  useEffect(() => {
    if (loading) {
      return
    }

    let start = async () => {
      console.log('starting')
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
    <LiveKitRoom
      serverUrl={wsURL}
      token={token}
      connect={token !== null ? true : false}
      audio={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  participantView: {
    height: 300,
  },
  title: { fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  data: { fontSize: 14 },
  errorText: { color: 'red', fontSize: 16 },
});