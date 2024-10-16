import React from 'react'
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { View, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Auth() {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID,
  })

  return (
    <View style={styles.container}>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={async () => {
          try {
            console.log("pressed")
            await GoogleSignin.hasPlayServices()
            console.log("got play services")
            const userInfo = await GoogleSignin.signIn()
            console.log("got user info")
            console.log(userInfo)

            if (userInfo.data?.idToken) {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: userInfo.data.idToken,
              })
              console.log(error, data)
            } else {
              throw new Error('no ID token present!')
            }
          } catch (error: any) {
            console.error(error)
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
              // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
              // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
              // play services not available or outdated
            } else {
              // some other error happened
            }
          }
        }}
      />
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
