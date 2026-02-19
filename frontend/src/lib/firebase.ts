import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyDbJ1bZSyGx7fFQ-96CnTH05QgRgW5Zfwc',
  authDomain: 'sentra-10085.firebaseapp.com',
  projectId: 'sentra-10085',
  storageBucket: 'sentra-10085.firebasestorage.app',
  messagingSenderId: '675542365266',
  appId: '1:675542365266:web:91193abf5b3ade077b1b8b',
  measurementId: 'G-ETYWJTEMJ1',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (typeof window !== 'undefined') {
  try {
    getAnalytics(app);
  } catch {
    // Analytics may fail in dev or restricted environments
  }
}
