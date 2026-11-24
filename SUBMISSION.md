# Devpost submission: Clario Lite

**Tagline:** A private, offline AI bookkeeper for the world's 400M+ small shops. Speak a sale and get your profit.

## Inspiration
Most small traders in Africa, South Asia and Latin America keep books in their heads or in paper notebooks. Connectivity is patchy and data costs money, and they don't want their sales figures sent to a server. Hybrid on-device AI fits this problem exactly.

## What it does
- Records sales and expenses from plain speech or text, including "45k" amounts, quantities, customers and suppliers.
- Shows today's sales and 7-day sales, expenses, profit and top sellers.
- Gives three practical tips grounded only in the computed figures.
- Badges show where the AI is running: on-device, cloud, or offline rules.

## How we built it
- Firebase AI Logic (`firebase/ai` 12.5) with `InferenceMode.PREFER_ON_DEVICE`, so Gemini Nano runs in Chrome when available and the cloud handles the rest.
- `initializeDeviceModel` triggers the model download on the first user action.
- App Check with reCAPTCHA Enterprise (Fraud Defense).
- The app is plain ES modules with no build step and is hosted on Firebase Hosting. Data lives in localStorage.

## Challenges
- Small models make arithmetic mistakes. We moved all maths into deterministic code and use the model only for language. Totals are always exact.
- To make it work with zero connectivity, we added a three-tier fallback: device, cloud, rules.

## What's next
Clario Lite is the web MVP of **Clario**, a mobile AI business OS. Next come Yoruba, Hausa and Pidgin input, inventory alerts and IndexedDB sync.

## Links
- Live app: [Firebase Hosting URL]
- Repo: [GitHub URL]
- Demo video (≤3 min): [YouTube URL]
