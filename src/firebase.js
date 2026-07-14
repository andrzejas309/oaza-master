import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const missingFirebaseEnvEntries = Object.entries(firebaseConfig)
    .filter(([, value]) => !value || String(value).includes("your-"))
    .map(([key]) => key);

if (missingFirebaseEnvEntries.length > 0) {
    throw new Error(
        [
            "Brakuje poprawnej konfiguracji Firebase.",
            `Uzupełnij zmienne Vite dla pól: ${missingFirebaseEnvEntries.join(", ")}.`,
            "Skopiuj `.env.example` do `.env.local`, wpisz prawdziwe wartości z Firebase Console i zrestartuj Vite."
        ].join(" ")
    );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
