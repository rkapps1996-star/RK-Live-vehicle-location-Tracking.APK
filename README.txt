RK LIVE VEHICLE TRACKING — NO LOGIN EDITION

1. Upload all files in this folder to the Netlify site's publish directory, replacing the old files.
2. Deploy the site.
3. Open the site in Chrome and clear site data once, then reload.

Login and Supabase have been removed completely. Vehicle details are stored only in this browser/device. GPS can be viewed on this phone and opened in Google Maps. Cloud sync, multi-user accounts, and real-time tracking between different phones are NOT available in this no-login version.


WhatsApp sharing: Start GPS, then tap WhatsApp share to send the latest Google Maps location link. This is a point-in-time link, not an automatically updating WhatsApp Live Location session. For continuous WhatsApp Live Location, use WhatsApp's own Attach > Location > Share Live Location feature. Keep this web app open while tracking; browser/Android battery settings may pause GPS in the background. Tap Stop to end GPS tracking.


GPS source selection (v7): Users can choose Mobile GPS, Vehicle GPS Device, or Both. The choice and optional device model/ID/server fields are saved locally on that device. The hardware GPS fields are setup placeholders only; actual device telemetry requires the tracker provider's server/API protocol and a secure backend. A static no-login website cannot directly connect to every tracker model or provide cross-device live tracking.

Hourly reports: while GPS tracking is active and the app is running, the latest location is saved locally once per hour. Reports can also be saved manually and exported as CSV. Reports are stored only in this browser/device; browser background suspension or closing the app can delay/stop hourly capture.
