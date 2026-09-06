import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/config";

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, job, area, message, op, menus, is_admin, is_paid, avatar_url, lat, lng, status, created_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async (sessionUser) => {
      setUser(sessionUser);
      if (sessionUser) {
        const profile = await fetchProfile(sessionUser.id);
        if (active) setUserProfile(profile);
      } else {
        if (active) setUserProfile(null);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, setUserProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
