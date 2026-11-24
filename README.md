# Clario Lite

An offline-first AI ledger for small shop owners. Type or say what happened ("Sold 3 bags of rice at 45k each to Mama Bisi") and Clario records it, totals your week and gives advice based on your own numbers.

Built for the **#BuildHybridAI** challenge with **Firebase AI Logic hybrid inference**:
- `InferenceMode.PREFER_ON_DEVICE`: Gemini Nano runs inside Chrome when available, so shop data stays private and parsing works offline.
- Gemini in the cloud is the automatic fallback on devices without Nano.
- A rule-based parser is the last fallback, so recording works even with no AI and no network.
- **The AI never does arithmetic.** Clario computes every total itself and the model only explains the figures, so it can't invent numbers.
- Firebase App Check (reCAPTCHA Enterprise (Fraud Defense)) protects the AI endpoint.

## Run it
1. Create a Firebase project, add a Web app, and paste the config into `firebase-config.js`.
2. In Firebase console → AI Logic, enable the Gemini Developer API.
3. In App Check, register the app with reCAPTCHA Enterprise (Fraud Defense) and paste the site key. On localhost a debug token prints in the console; add it under App Check → Manage debug tokens.
4. To serve locally, run `npx serve .` (or `python3 -m http.server`) and open it in Chrome 139+.
5. For on-device AI, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and restart Chrome.
6. To deploy, run `npm i -g firebase-tools && firebase login && firebase init hosting && firebase deploy`.

## Files
- `ai.js`: Firebase AI Logic hybrid model, App Check and on-device download.
- `ledger.js`: storage, rule parser and totals (pure; tested in `test/`).
- `app.js`, `index.html`, `styles.css`: the UI.

MIT licensed.
