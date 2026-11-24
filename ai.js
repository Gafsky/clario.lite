// Firebase AI Logic with hybrid inference: Gemini Nano on-device when Chrome has it,
// Gemini in the cloud otherwise. Shop data never needs the cloud when the device can answer.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js'
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app-check.js'
import {firebaseConfig, recaptchaSiteKey} from './firebase-config.js'

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  // Prints a debug token in the console; register it under App Check → Manage debug tokens.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

const app = initializeApp(firebaseConfig)
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
  isTokenAutoRefreshEnabled: true,
})
const ai = getAI(app, {backend: new GoogleAIBackend()})
const model = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: {model: 'gemini-3.5-flash-lite'},
})

let deviceModelRequested = false

/** Where the next prompt will most likely run: 'device', 'downloading' or 'cloud'. */
export async function engineStatus() {
  try {
    if (!('LanguageModel' in self)) return 'cloud'
    const a = await self.LanguageModel.availability()
    if (a === 'available') return 'device'
    if (a === 'downloading' || a === 'downloadable') return 'downloading'
    return 'cloud'
  } catch {
    return 'cloud'
  }
}

/** Starts the Gemini Nano download. Must follow a user gesture. */
export function prepareDeviceModel(onProgress) {
  if (deviceModelRequested) return
  deviceModelRequested = true
  try {
    model.initializeDeviceModel?.(p => onProgress?.(p))
  } catch (err) {
    console.warn('On-device model unavailable; cloud fallback will be used.', err)
  }
}

export async function generate(prompt) {
  const result = await model.generateContent(prompt)
  return result.response.text()
}
