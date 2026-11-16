package com.rkapps.vehicletracking;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.util.ArrayList;

import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final int APP_PERMISSION_REQUEST = 101;
    private WebView webView;
    private WebViewAssetLoader assetLoader;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView = new WebView(this);
        setContentView(webView);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setGeolocationEnabled(true);
        webView.getSettings().setSupportMultipleWindows(true);
        webView.addJavascriptInterface(new AndroidBridge(), "Android");
        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && "appassets.androidplatform.net".equalsIgnoreCase(uri.getHost())) return false;
                openExternal(uri.toString());
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                boolean allowed = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                        || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                callback.invoke(origin, allowed, false);
            }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        openExternal(request.getUrl().toString());
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        requestNeededPermissions();
    }

    private void requestNeededPermissions() {
        if (Build.VERSION.SDK_INT < 23) return;
        ArrayList<String> needed = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED)
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
        if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED)
            needed.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        if (!needed.isEmpty()) requestPermissions(needed.toArray(new String[0]), APP_PERMISSION_REQUEST);
    }

    private void openExternal(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { Toast.makeText(this, "లింక్ తెరవలేకపోయాం", Toast.LENGTH_SHORT).show(); }
    }

    private class AndroidBridge {
        @JavascriptInterface public void startTracking(String vehicleName) {
            runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                        && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    requestNeededPermissions();
                    Toast.makeText(MainActivity.this, "GPS అనుమతి ఇవ్వండి; తర్వాత Tracking ప్రారంభించండి.", Toast.LENGTH_LONG).show();
                    return;
                }
                Intent intent = new Intent(MainActivity.this, TrackingService.class);
                intent.setAction(TrackingService.ACTION_START);
                intent.putExtra(TrackingService.EXTRA_VEHICLE, vehicleName);
                if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent); else startService(intent);
            });
        }
        @JavascriptInterface public void stopTracking() {
            runOnUiThread(() -> {
                Intent intent = new Intent(MainActivity.this, TrackingService.class);
                intent.setAction(TrackingService.ACTION_STOP);
                startService(intent);
            });
        }
        @JavascriptInterface public String getHourlyReports() {
            return getSharedPreferences(TrackingService.PREFS, MODE_PRIVATE).getString(TrackingService.KEY_REPORTS, "[]");
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
