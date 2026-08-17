import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'blog-mern-24541.firebaseapp.com',
  projectId: 'blog-mern-24541',
  storageBucket: 'blog-mern-24541.appspot.com',
  messagingSenderId: '990910487828',
  appId: '1:990910487828:web:4146cd785cdaf92ab876601',
};

// initializeApp() throws synchronously if apiKey is missing/invalid. This
// module is imported statically all the way from main.jsx (App -> SignIn ->
// OAuth -> firebase.js), so an uncaught throw here crashes the entire app
// before React even starts rendering — no error boundary can catch it,
// since this runs at module-evaluation time, not during render. Previously
// this took down the whole SPA (blank white page) whenever
// VITE_FIREBASE_API_KEY wasn't set at build time.
//
// Instead: catch it, log clearly, and export `app` as null. Only the
// Google sign-in feature breaks (handled explicitly in OAuth.jsx) — every
// other page keeps working normally.
export let app = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'VITE_FIREBASE_API_KEY is not set. Google sign-in will be unavailable. ' +
      'This must be provided at build time (see .env.example).'
    );
  }
  app = initializeApp(firebaseConfig);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('[firebase] Failed to initialize:', error.message);
}
