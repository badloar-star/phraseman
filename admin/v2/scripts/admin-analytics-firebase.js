import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

const MONEY_READ_ROLES = new Set(['owner', 'admin', 'analyst']);

function unwrap(result) {
  return result && typeof result === 'object' && 'data' in result ? result.data : result;
}

async function resolveFirebaseConfig() {
  const injected = globalThis.PHR_MAN_FIREBASE_CONFIG;
  if (injected && typeof injected === 'object') return injected;
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('firebase_hosting_config_unavailable');
  const config = await response.json();
  if (!config || typeof config !== 'object' || !config.projectId) throw new Error('firebase_hosting_config_invalid');
  return config;
}

function permissionError() {
  const error = new Error('money.read permission required');
  error.code = 'permission-denied';
  return error;
}

export async function createAnalyticsAdminActions({ onAuth }) {
  const app = initializeApp(await resolveFirebaseConfig());
  const auth = getAuth(app);
  const functionsUs = getFunctions(app, 'us-central1');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const productAnalyticsCallable = httpsCallable(functionsUs, 'adminProductAnalytics');
  const subscriptionAnalyticsCallable = httpsCallable(functionsUs, 'adminSubscriptionAnalytics');
  const monthlyDecisionPackCallable = httpsCallable(functionsUs, 'adminMonthlyDecisionPack');
  let authorized = false;

  const requireAuthorized = async (callable, input) => {
    if (!authorized) throw permissionError();
    return unwrap(await callable(input));
  };

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      authorized = false;
      onAuth({ authorized: false, email: '', role: '' });
      return;
    }
    try {
      const token = await user.getIdTokenResult(true);
      const role = typeof token.claims.adminRole === 'string' ? token.claims.adminRole : '';
      authorized = token.claims.admin === true && MONEY_READ_ROLES.has(role);
      onAuth({ authorized, email: user.email ?? '', role });
    } catch {
      authorized = false;
      onAuth({ authorized: false, email: user.email ?? '', role: '' });
    }
  });

  return Object.freeze({
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
    loadProductAnalytics: (input) => requireAuthorized(productAnalyticsCallable, input),
    loadSubscriptionAnalytics: (input) => requireAuthorized(subscriptionAnalyticsCallable, input),
    generateMonthlyDecisionPack: (input) => requireAuthorized(monthlyDecisionPackCallable, input),
  });
}
