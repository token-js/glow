import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import Auth, { sleep, fetchUserSettings } from '../../components/auth'
import { HomeScreen } from '../../components/screens/home'
import { SignupFlow } from '../../components/signup'
import { Settings } from '@prisma/client'
import { supabase } from '../../lib/supabase'
import { segmentTrackOpened } from '../../lib/analytics'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false)
  const [settings, setSettings] = useState<Settings | null>()
  const [loading, setLoading] = useState<boolean>(true)

  const setupSettings = async (userId: string) => {
    setSettings(await fetchUserSettings(userId))
    sleep(1000)
    setLoading(false)
  }

  const handleSetupSettings = async (session: Session | null) => {
    if (session) {
      segmentTrackOpened(session.user.id)
      setLoading(true)
      setupSettings(session.user.id)
    } else {
      setSettings(null)
    }
  }

  useEffect(() => {
    handleSetupSettings(session)
  }, [session])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
    })
  }, [])

  const didConfigureSettings = settings && settings?.agentName !== null && settings?.gender !== null && settings.name !== null && settings.voice !== null

  if (session && loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Auth setSession={setSession} setShowSignupFlow={setShowSignupFlow} />
      </View>
    )
  } else if (showSignupFlow || didConfigureSettings === false) {
    return (
      <View style={styles.container}>
        <SignupFlow session={session} setShowSignupFlow={setShowSignupFlow} setSettings={setSettings} />
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
