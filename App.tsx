import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import { View, Text, StyleSheet } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <View style={styles.container}>
      <Auth />
      {session && session.user && <Text>{session.user.id}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Makes the parent view fill the screen
    justifyContent: 'center', // Centers vertically
    alignItems: 'center', // Centers horizontally
  },
})
