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
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

registerGlobals();

export const VoiceInterface = ({ session }: { session: Session }) => {
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
    <LiveKitRoom
      serverUrl={wsURL}
      token={token}
      connect={token !== null ? true : false}
      audio={true}
    />
  );
};