import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, ADMIN_PIN } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    setProfile(data)
    setLoading(false)
  }

  // Register vendor
  async function signUpVendedor({ email, password, nombre_completo, telefono }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre_completo } },
    })
    if (error) return { error }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        nombre_completo,
        telefono,
        rol:    'vendedor',
        estado: 'pendiente',
      })
    }
    return { data }
  }

  // Register admin with PIN
  async function signUpAdmin({ email, password, nombre_completo, pin }) {
    if (pin !== ADMIN_PIN) return { error: { message: 'PIN incorrecto' } }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre_completo } },
    })
    if (error) return { error }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        nombre_completo,
        rol:    'admin',
        estado: 'aprobado',
      })
    }
    return { data }
  }

  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin:    profile?.rol === 'admin',
      isVendor:   profile?.rol === 'vendedor',
      isApproved: profile?.estado === 'aprobado',
      signUpVendedor, signUpAdmin, signIn, signOut,
      refreshProfile: () => user && loadProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
