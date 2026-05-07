import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBcb7sbtyR97Z020movmjL8bh_QNaYmbA4",
  authDomain: "aspire-ai-618de.firebaseapp.com",
  projectId: "aspire-ai-618de",
  storageBucket: "aspire-ai-618de.firebasestorage.app",
  messagingSenderId: "568284665435",
  appId: "1:568284665435:web:197649998c79c1b920517e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;