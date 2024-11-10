import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import Auth, { sleep, fetchUserSettings } from '../../components/Auth'
import { HomeScreen } from '../../components/screens/home'
import { SignupFlow } from '../../components/signup'
import { Settings } from '@prisma/client'
import { supabase } from '../../lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
    })
  }, [])


  if (!session) {
    return (
      <View style={styles.container}>
        <Auth setSession={setSession} setShowSignupFlow={setShowSignupFlow} />
      </View>
    )
  } else if (showSignupFlow) {
    return (
      <View style={styles.container}>
        <SignupFlow session={session} setShowSignupFlow={setShowSignupFlow} />
      </View>
    )
  } else {
    return (
      <View style={styles.container}>
        <HomeScreen />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    justifyContent: 'center'
  },
})
