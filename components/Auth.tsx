import React from 'react'
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { View, StyleSheet, Text } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Auth() {
  GoogleSignin.configure({
    scopes: [],
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID,
  })

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
