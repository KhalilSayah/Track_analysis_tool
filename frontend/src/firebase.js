import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBDEMZEsWQo9naWu9_KtsqtqhNgkUNhvLs",
  authDomain: "karting-65c6c.firebaseapp.com",
  projectId: "karting-65c6c",
  storageBucket: "karting-65c6c.firebasestorage.app",
  messagingSenderId: "1027908785385",
  appId: "1:1027908785385:web:91d59f648c4374157d4c78",
  measurementId: "G-197WPKRJSW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
