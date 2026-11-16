RK LIVE VEHICLE TRACKING — Android Studio project (No-login, Version 1.1)

WHAT IS INCLUDED
- Latest no-login RK Live Vehicle Tracking web interface bundled locally in an Android WebView.
- Vehicle garage, mobile GPS selection, vehicle-GPS device setup fields, hourly reports, CSV export, WhatsApp point-in-time map link and official eChallan link.
- Native Android foreground location service with persistent notification while the user has explicitly started tracking.
- Native hourly GPS report storage and synchronization back into the app.
- GitHub Actions workflow to build a debug APK.

PRIVACY / LIMITATIONS
- No login and no cloud sync. Vehicle details and reports remain on this phone.
- GPS starts only after the user chooses a vehicle, confirms consent and grants Android location permission. Tap Stop to end it.
- Android battery restrictions, location being disabled, or Force Stop can interrupt tracking. The foreground notification should remain visible while the service is running.
- The app records a native location report once per hour while the foreground location service is active; live location is not uploaded to another phone.
- WhatsApp sharing sends the latest map URL only. To share continuously updated live location, start WhatsApp's own Share Live Location feature.
- Vehicle GPS Device model/ID/server values are local setup fields only. Real hardware integration requires the device provider's API/protocol and a secure backend.
- The ₹99/month plan is display-only; no payment gateway is connected. Challans are checked on the official government portal.

BUILD WITH GITHUB ACTIONS (PHONE OR COMPUTER)
1. Create a GitHub repository.
2. Upload the contents of this project folder to the repository root, including the .github folder.
3. Open Actions → Build RK Vehicle Tracking APK → Run workflow.
4. When the workflow finishes, open the run and download artifact RK-LIVE-VEHICLE-TRACKING-debug-apk.
5. Extract the artifact ZIP and install app-debug.apk on Android.

BUILD WITH ANDROID STUDIO
1. Open this folder in Android Studio.
2. Install Android SDK Platform 35 when requested and allow Gradle sync.
3. Build → Build Bundle(s) / APK(s) → Build APK(s).
4. Find the APK at app/build/outputs/apk/debug/app-debug.apk.

Package: com.rkapps.vehicletracking
Minimum Android: 6.0 (API 23)
Target SDK: 35
Java: 17 for the Gradle build.
