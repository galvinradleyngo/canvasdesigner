const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U',
  authDomain: 'tdt-sandbox.firebaseapp.com',
  projectId: 'tdt-sandbox',
  storageBucket: 'tdt-sandbox.firebasestorage.app',
  messagingSenderId: '924451875699',
  appId: '1:924451875699:web:46464d31b27c4c62b3f306'
};

const DEFAULT_SERVICE_ACCOUNT = {
  email: 'canvasdesigner-service@tdt-sandbox.firebaseapp.com',
  password: 'saltisasin'
};

const DEFAULT_COLLECTIONS = {
  activities: 'canvasDesignerActivities',
  responses: 'wordCloudResponses'
};

const sanitiseString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed;
};

const sanitiseCollectionName = (value) => {
  const trimmed = sanitiseString(value);
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/[^A-Za-z0-9_-]/g, '');
};

const decodeBase64 = (value) => {
  if (typeof value !== 'string' || !value) {
    return '';
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    try {
      return globalThis.atob(value);
    } catch (error) {
      return '';
    }
  }
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(value, 'base64').toString('utf-8');
    } catch (error) {
      return '';
    }
  }
  return '';
};

const readEnv = (key) => {
  if (typeof process === 'undefined' || !process?.env) {
    return undefined;
  }
  const value = process.env[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const mergeDefined = (target, source) => {
  if (!source || typeof source !== 'object') {
    return target;
  }
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      target[key] = trimmed;
      return;
    }
    target[key] = value;
  });
  return target;
};

export const getFirebaseConfig = () => {
  const config = { ...DEFAULT_FIREBASE_CONFIG };

  const envJson = readEnv('CANVASDESIGNER_FIREBASE_CONFIG_JSON');
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      mergeDefined(config, parsed);
    } catch (error) {
      console.warn('Invalid CANVASDESIGNER_FIREBASE_CONFIG_JSON value', error);
    }
  }

  const envOverrides = {
    apiKey: readEnv('CANVASDESIGNER_FIREBASE_API_KEY'),
    authDomain: readEnv('CANVASDESIGNER_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('CANVASDESIGNER_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('CANVASDESIGNER_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('CANVASDESIGNER_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('CANVASDESIGNER_FIREBASE_APP_ID')
  };
  mergeDefined(config, envOverrides);

  if (typeof window !== 'undefined') {
    const override = window.CANVASDESIGNER_FIREBASE_CONFIG;
    if (override && typeof override === 'object') {
      mergeDefined(config, override);
    }
  }

  return config;
};

export const getServiceAccountConfig = () => {
  const credentials = { ...DEFAULT_SERVICE_ACCOUNT };

  const envEmail = readEnv('CANVASDESIGNER_FIREBASE_SERVICE_EMAIL');
  if (envEmail) {
    credentials.email = envEmail;
  }

  const envPasswordBase64 = readEnv('CANVASDESIGNER_FIREBASE_SERVICE_PASSWORD_BASE64');
  if (envPasswordBase64) {
    const decoded = decodeBase64(envPasswordBase64);
    if (decoded) {
      credentials.password = decoded;
    }
  } else {
    const envPassword = readEnv('CANVASDESIGNER_FIREBASE_SERVICE_PASSWORD');
    if (envPassword) {
      credentials.password = envPassword;
    }
  }

  if (typeof window !== 'undefined') {
    const override = window.CANVASDESIGNER_FIREBASE_SERVICE_ACCOUNT;
    if (override && typeof override === 'object') {
      if (typeof override.email === 'string' && override.email.trim()) {
        credentials.email = override.email.trim();
      }
      if (typeof override.passwordBase64 === 'string' && override.passwordBase64.trim()) {
        const decoded = decodeBase64(override.passwordBase64.trim());
        if (decoded) {
          credentials.password = decoded;
        }
      } else if (typeof override.password === 'string' && override.password.trim()) {
        credentials.password = override.password.trim();
      }
    }
  }

  return credentials;
};

const getCollectionOverrides = () => {
  const overrides = { ...DEFAULT_COLLECTIONS };

  const activities = sanitiseCollectionName(readEnv('CANVASDESIGNER_FIRESTORE_ACTIVITIES_COLLECTION'));
  if (activities) {
    overrides.activities = activities;
  }
  const responses = sanitiseCollectionName(readEnv('CANVASDESIGNER_FIRESTORE_RESPONSES_COLLECTION'));
  if (responses) {
    overrides.responses = responses;
  }

  if (typeof window !== 'undefined') {
    const runtime = window.CANVASDESIGNER_FIRESTORE_COLLECTIONS;
    if (runtime && typeof runtime === 'object') {
      if (typeof runtime.activities === 'string') {
        const sanitised = sanitiseCollectionName(runtime.activities);
        if (sanitised) {
          overrides.activities = sanitised;
        }
      }
      if (typeof runtime.responses === 'string') {
        const sanitised = sanitiseCollectionName(runtime.responses);
        if (sanitised) {
          overrides.responses = sanitised;
        }
      }
    }
  }

  return overrides;
};

export const getActivitiesCollectionName = () => getCollectionOverrides().activities;
export const getResponsesCollectionName = () => getCollectionOverrides().responses;
