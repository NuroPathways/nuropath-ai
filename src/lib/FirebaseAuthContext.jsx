import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const AuthContext = createContext(null);

export function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch extra profile from Firestore
        const userDoc = await getDoc(doc(db, "User", firebaseUser.uid));
        const profile = userDoc.exists() ? userDoc.data() : {};
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || profile.full_name || "",
          role: profile.role || "user",
          app_role: profile.app_role || null,
          ...profile,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const register = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    await setDoc(doc(db, "User", cred.user.uid), {
      email,
      full_name: displayName || "",
      role: "user",
      app_role: null,
      created_date: serverTimestamp(),
    });
    return cred.user;
  };

  const logout = async (redirectUrl) => {
    await signOut(auth);
    window.location.href = redirectUrl || "/Splash";
  };

  const updateMe = async (data) => {
    if (!user) return;
    await setDoc(doc(db, "User", user.id), data, { merge: true });
    setUser((prev) => ({ ...prev, ...data }));
  };

  const me = () => user;

  const isAuthenticated = () => !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateMe, me, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  return useContext(AuthContext);
}