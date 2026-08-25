import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyBb4dv3NRdik3_aMTVOsPRQMld9Cdrwe4M",
  authDomain: "coursegram.firebaseapp.com",
  projectId: "coursegram",
  storageBucket: "coursegram.firebasestorage.app",
  messagingSenderId: "485415200949",
  appId: "1:485415200949:web:3d128a9b583797c341b6fc",
  measurementId: "G-GK7E8274PQ",
}

const app = initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(app)

export async function initFirebaseAnalytics(): Promise<void> {
  try {
    if (await isSupported()) {
      getAnalytics(app)
    }
  } catch {
    // analytics is optional and must never break the app
  }
}
