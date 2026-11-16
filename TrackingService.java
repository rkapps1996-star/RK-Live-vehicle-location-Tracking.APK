package com.rkapps.vehicletracking;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class TrackingService extends Service implements LocationListener {
    public static final String ACTION_START = "com.rkapps.vehicletracking.START";
    public static final String ACTION_STOP = "com.rkapps.vehicletracking.STOP";
    public static final String EXTRA_VEHICLE = "vehicle";
    public static final String PREFS = "rk_native_tracking";
    public static final String KEY_REPORTS = "hourly_reports";
    private static final String CHANNEL = "rk_vehicle_tracking";
    private static final int NOTIFICATION_ID = 71;
    private LocationManager locationManager;
    private long lastSavedAt = 0;
    private String vehicleName = "నా వాహనం";

    @Override public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopLocation();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null) vehicleName = intent.getStringExtra(EXTRA_VEHICLE) == null ? "నా వాహనం" : intent.getStringExtra(EXTRA_VEHICLE);
        startForeground(NOTIFICATION_ID, buildNotification());
        startLocation();
        return START_STICKY;
    }

    private void startLocation() {
        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopSelf();
            return;
        }
        try {
            String provider = checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    ? LocationManager.GPS_PROVIDER : LocationManager.NETWORK_PROVIDER;
            if (locationManager.isProviderEnabled(provider)) {
                locationManager.requestLocationUpdates(provider, 15000L, 0f, this, Looper.getMainLooper());
                Location last = locationManager.getLastKnownLocation(provider);
                if (last != null) onLocationChanged(last);
            }
        } catch (SecurityException ignored) { stopSelf(); }
    }

    @Override public void onLocationChanged(Location location) {
        long now = System.currentTimeMillis();
        if (lastSavedAt != 0 && now - lastSavedAt < 60L * 60L * 1000L) return;
        lastSavedAt = now;
        try {
            JSONObject row = new JSONObject();
            row.put("id", now);
            row.put("vehicle", vehicleName);
            row.put("time", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date(now)));
            row.put("latitude", location.getLatitude());
            row.put("longitude", location.getLongitude());
            row.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : 0);
            row.put("mapUrl", "https://www.google.com/maps?q=" + location.getLatitude() + "," + location.getLongitude());
            JSONArray old = new JSONArray(getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_REPORTS, "[]"));
            JSONArray updated = new JSONArray();
            updated.put(row);
            for (int i = 0; i < old.length() && i < 999; i++) updated.put(old.getJSONObject(i));
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_REPORTS, updated.toString()).apply();
        } catch (JSONException ignored) { }
    }

    private Notification buildNotification() {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return builder.setContentTitle("RK LIVE VEHICLE TRACKING")
                .setContentText("GPS ట్రాకింగ్ కొనసాగుతోంది — ఆపడానికి యాప్‌లో Stop నొక్కండి")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Vehicle GPS Tracking", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void stopLocation() {
        if (locationManager != null) locationManager.removeUpdates(this);
    }
    @Override public void onDestroy() { stopLocation(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
