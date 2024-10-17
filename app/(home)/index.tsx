import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import Auth from '../../components/Auth'
import { HomeScreen } from '../../components/screens/home'

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
      {(session && session.user) ? <HomeScreen /> : <Auth />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
