/**
 * Drop-in hook that returns the current Firebase-authenticated user
 * with their Firestore profile merged in.
 * 
 * Usage: const { user, loading } = useFirebaseUser();
 */
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export function useFirebaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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

  return { user, loading };
}