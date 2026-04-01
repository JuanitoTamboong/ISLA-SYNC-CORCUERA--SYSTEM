# ISLA-Sync Corcuera - Android WebView App

Complete Android mobile app for Corcuera community management (WebView).

## 🚀 Quick Start

1. **Supabase Setup**
   ```
   1. Create free Supabase project at supabase.com
   2. Copy URL and anon/public key from Settings > API
   3. Run schema.sql in SQL Editor
   4. Enable Realtime on 'reports' and 'news' tables
   ```

2. **Google Maps API**
   ```
   1. Get API key from console.cloud.google.com
   2. Enable Maps JavaScript API
   3. Replace YOUR_GOOGLE_MAPS_API_KEY in index.html
   ```

3. **Update Configs** (app.js)
   ```js
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseKey = 'YOUR_ANON_KEY';
   ```

4. **Test in Browser**
   ```
   Open index.html in Chrome
   DevTools: Toggle device toolbar > 360px width > Portrait
   ```

## 📱 Convert to APK (Capacitor - Recommended)

```bash
# Install Capacitor
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# Init
npx cap init IslaSync com.corcuera.islasync 1.0.0

# Add Android
npx cap add android

# Sync & Open
npx cap sync
npx cap open android
```

**capacitor.config.ts:**
```ts
export const config = {
  appId: 'com.corcuera.islasync',
  appName: 'ISLA-Sync Corcuera',
  webDir: '.',
  server: { androidScheme: 'https' },
  android: {
    allowMixedContent: true
  }
};
```

Build APK in Android Studio (Build > Generate Signed Bundle/APK).

## 🛠 Features Implemented

✅ **Android Material Design** (bottom nav/FAB/cards/ripples)  
✅ **Auth** (email/password, Google/FB placeholders, user types)  
✅ **Home** (weather/news/tourist cards)  
✅ **Full Google Maps** + markers/legend/search  
✅ **Report Form** (category/image/map pin/ref#)  
✅ **News Tabs** (news/tourism/souvenirs/fares)  
✅ **Profile** (stats/my reports)  
✅ **Settings** (dark mode/logout)  
✅ **Admin Dashboard** (pending/in-progress/resolved)  
✅ **Realtime Updates** (Supabase subscriptions)  
✅ **Toast/Loading/Dialogs** (Android style)  

## 📂 File Structure

```
.
├── index.html      # Main SPA
├── style.css       # Material Design mobile CSS
├── app.js          # All logic + Supabase/Maps
├── schema.sql      # Supabase DB setup
├── README.md       # ← You are here
└── assets/         # Add logo.png, icons
```

## 🔧 Supabase Config (app.js)

Replace placeholders:
```js
const supabaseUrl = 'https://xyz.supabase.co';
const supabaseKey = 'eyJ...';
```

## 🎯 Testing Checklist

- [ ] Portrait 360px Chrome DevTools
- [ ] Auth flow (signup/login)
- [ ] Report submission + image upload
- [ ] Map markers + geolocation
- [ ] Realtime updates (2 browser tabs)
- [ ] Dark mode toggle
- [ ] Admin vs Resident views
- [ ] FAB hidden for non-residents

## 📱 APK Optimization

**android/app/src/main/res/xml/config.xml:**
```xml
<platform name="android">
  <preference name="StatusBarBackgroundColor" value="#2196F3"/>
  <preference name="android-minSdkVersion" value="24"/>
  <allow-navigation href="*"/>
  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />
</platform>
```

**WebView Settings (MainActivity.java):**
```java
webView.getSettings().setDomStorageEnabled(true);
webView.getSettings().setJavaScriptEnabled(true);
webView.getSettings().setLoadWithOverviewMode(true);
webView.getSettings().setUseWideViewPort(true);
```

## 🎨 Design Notes

- **Colors:** Android Blue (#2196F3) + Orange accent
- **Fonts:** Roboto (Google Fonts)
- **Touch:** 48dp minimum targets
- **Viewport:** Portrait-only, no zoom
- **Performance:** Pure Vanilla JS, no frameworks

## 🚀 Production Deploy

1. Host static files (Netlify/Vercel)
2. Update capacitor.config.ts server.url
3. `npx cap sync && npx cap build android`

**App ready for Google Play Store submission!**

---

*Built with ❤️ for Corcuera by BLACKBOXAI*
