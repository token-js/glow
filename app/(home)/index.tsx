import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import Auth from '../../components/Auth'
import { HomeScreen } from '../../components/screens/home'
import { SignupFlow } from '../../components/signup'
import { Settings } from '@prisma/client'
import { convertSQLToSettings } from '../../lib/utils'

const fetchUserSettings = async (userId: string): Promise<Settings | null> => {
  const { data } = await supabase
    .from('settings')
    .select()
    .eq('id', userId)

  return convertSQLToSettings(data)
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const { data } = await supabase.auth.getUser()
      setSession(session)
      setUser(data.user)
      console.log("user")
      console.log(data.user)
      if (data.user) {
        let internalSettings = null
        while (internalSettings === null) {
          internalSettings = await fetchUserSettings(data.user.id)
          console.log("settings")
          console.log(internalSettings)
          await sleep(1000)
          setSettings(internalSettings)
        }
      }
    })
  }, [])

  const completedSignup = settings?.name && settings.gender && settings.voice

  if (!user) {
    return (
      <View style={styles.container}>
        <Auth />
      </View>
    )
  } else if (settings === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    )
  } else if (session) {
    return (
      <View style={styles.container}>
        {completedSignup ? <HomeScreen /> : <SignupFlow session={session} settings={settings} setSettings={setSettings} />}
      </View>
    )
  } else {
    throw new Error("Failed to fetch session for signed in user, this should never happen")
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    justifyContent: 'center'
  },
})
