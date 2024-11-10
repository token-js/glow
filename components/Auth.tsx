import React, { useEffect } from 'react'
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { View, StyleSheet, Text } from 'react-native'
import { supabase } from '../lib/supabase'
import { Session, User } from '@supabase/supabase-js'
import { convertSQLToSettings } from '../lib/utils'
import { $Enums, Settings } from '@prisma/client'

type Props = {
  setSession: React.Dispatch<React.SetStateAction<Session | null>>
  setShowSignupFlow: React.Dispatch<React.SetStateAction<boolean>>
}

export const fetchUserSettings = async (userId: string): Promise<Settings | null> => {
  const { data } = await supabase
    .from('settings')
    .select()
    .eq('id', userId)

  return convertSQLToSettings(data)
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function Auth({ setSession, setShowSignupFlow }: Props) {
  GoogleSignin.configure({
    scopes: [],
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID,
  })

  const handleDidSignin = async (user: User, session: Session) => {
    setSession(session)
    let settings = null
    while (settings === null) {
      settings = await fetchUserSettings(user.id)
      await sleep(1000)
    }

    // If the user hasn't filled out their profile, then show the signup flow
    console.log(settings)
    if (settings.name === null) {
      setShowSignupFlow(true)
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 15, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Welcome to Glow</Text>
      </View>
      <View style={{ flex: 1 }}>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={async () => {
            try {
              await GoogleSignin.hasPlayServices()
              const userInfo = await GoogleSignin.signIn()
              if (userInfo.data?.idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: userInfo.data.idToken,
                })

                console.log("finished signing in with token")
                console.log(data.user)

                if (data.user) {
                  await handleDidSignin(data.user, data.session)
                }
              } else {
                throw new Error('no ID token present!')
              }
            } catch (error: any) {
              if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
              } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
              } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                // play services not available or outdated
              } else {
                throw error
              }
            }
          }}
        />        
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', // Pushes the button to the bottom
    alignItems: 'center', // Centers horizontally
    paddingBottom: 30, // Optional: Adds some padding to the bottom
  },
})
