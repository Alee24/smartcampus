package com.smartcampus.gatepass;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.widget.FrameLayout;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import android.nfc.NfcAdapter;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.app.PendingIntent;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String PREFS_NAME = "SmartCampusPrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "https://smartcampus.ru.ac.ke/"; // Default smartcampus portal

    private static final int REQUEST_CODE_PERMISSIONS = 1001;
    private static final int INPUT_FILE_REQUEST_CODE = 1;

    private WebView mWebView;
    private ProgressBar mProgressBar;
    private SwipeRefreshLayout mSwipeRefresh;
    private LinearLayout mLayoutOffline;
    private LinearLayout mLayoutSplash;
    private String mServerUrl;

    private ValueCallback<Uri[]> mFilePathCallback;
    private String mCameraPhotoPath;
    private GeolocationPermissions.Callback mGeoCallback;
    private String mGeoOrigin;

    // NFC variables
    private NfcAdapter mNfcAdapter;
    private PendingIntent mPendingIntent;
    private boolean mNfcScanningEnabled = false;
    private String mPendingWritePayload = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Load configured Server URL (defaults to null to prompt on first run)
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        mServerUrl = prefs.getString(KEY_SERVER_URL, null);

        // Initialize UI Elements
        mWebView = findViewById(R.id.webView);
        mProgressBar = findViewById(R.id.progressBar);
        mSwipeRefresh = findViewById(R.id.swipeRefreshLayout);
        mLayoutOffline = findViewById(R.id.layoutOffline);
        mLayoutSplash = findViewById(R.id.layoutSplash);

        Button btnRetry = findViewById(R.id.btnRetry);
        Button btnSettings = findViewById(R.id.btnSettings);

        btnRetry.setOnClickListener(v -> reloadApp());
        btnSettings.setOnClickListener(v -> showUrlConfigDialog());

        // Configure Swipe Refresh
        mSwipeRefresh.setColorSchemeResources(R.color.purple_500, R.color.purple_700);
        mSwipeRefresh.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                mWebView.reload();
            } else {
                mSwipeRefresh.setRefreshing(false);
                showOfflineScreen(true);
            }
        });

        // Initialize and Setup WebView
        setupWebView();

        // Load current URL if configured, otherwise prompt user
        if (mServerUrl == null) {
            if (mLayoutSplash != null) {
                mLayoutSplash.setVisibility(View.GONE); // Hide splash loader to let user interact with setup dialog
            }
            showInitialUrlConfigDialog();
        } else {
            loadUrl(mServerUrl);
        }

        // Check Permissions Proactively
        checkAndRequestPermissions();

        // Initialize NFC Adapter & Pending Intent
        mNfcAdapter = NfcAdapter.getDefaultAdapter(this);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        mPendingIntent = PendingIntent.getActivity(this, 0,
                new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                flags);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        
        // App caching & Cookies
        CookieManager.getInstance().setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(mWebView, true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Custom User Agent to detect mobile wrapper
        String defaultAgent = settings.getUserAgentString();
        settings.setUserAgentString(defaultAgent + " SmartCampusMobileWrapper");

        // Add AndroidNFC javascript interface
        mWebView.addJavascriptInterface(new AndroidNFCInterface(this), "AndroidNFC");

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                mProgressBar.setVisibility(View.VISIBLE);
                showOfflineScreen(false);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mProgressBar.setVisibility(View.GONE);
                mSwipeRefresh.setRefreshing(false);
                if (mLayoutSplash != null) {
                    mLayoutSplash.setVisibility(View.GONE);
                }
                injectNdefPolyfill(view);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Log.e(TAG, "WebView error: " + error.getDescription() + " (Code: " + error.getErrorCode() + ")");
                }
                if (mLayoutSplash != null) {
                    mLayoutSplash.setVisibility(View.GONE);
                }
                // Only trigger offline screen for main frame load failures
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    if (request.isForMainFrame()) {
                        showOfflineScreen(true);
                    }
                } else {
                    showOfflineScreen(true);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    String url = request.getUrl().toString();
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        return false; // Load inside WebView
                    } else {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            Log.e(TAG, "Error opening external scheme: " + url, e);
                            return true;
                        }
                    }
                }
                return false;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            // Geolocation permissions
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                mGeoCallback = callback;
                mGeoOrigin = origin;
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                            REQUEST_CODE_PERMISSIONS);
                } else {
                    callback.invoke(origin, true, false);
                }
            }

            // File selection & Camera capture
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
                    File photoFile = null;
                    try {
                        photoFile = createImageFile();
                        takePictureIntent.putExtra("PhotoPath", mCameraPhotoPath);
                    } catch (IOException ex) {
                        Log.e(TAG, "Unable to create Image File", ex);
                    }

                    if (photoFile != null) {
                        Uri photoURI = FileProvider.getUriForFile(MainActivity.this,
                                "com.smartcampus.gatepass.fileprovider",
                                photoFile);
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                        takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    } else {
                        takePictureIntent = null;
                    }
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("image/*");

                Intent[] intentArray;
                if (takePictureIntent != null) {
                    intentArray = new Intent[]{takePictureIntent};
                } else {
                    intentArray = new Intent[0];
                }

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Select Action");
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

                startActivityForResult(chooserIntent, INPUT_FILE_REQUEST_CODE);
                return true;
            }
        });
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        File image = File.createTempFile(imageFileName, ".jpg", storageDir);
        mCameraPhotoPath = "file:" + image.getAbsolutePath();
        return image;
    }

    private void loadUrl(String url) {
        if (isNetworkAvailable()) {
            showOfflineScreen(false);
            mWebView.loadUrl(url);
        } else {
            showOfflineScreen(true);
        }
    }

    private void reloadApp() {
        mSwipeRefresh.setRefreshing(true);
        loadUrl(mServerUrl);
    }

    private void showOfflineScreen(boolean isOffline) {
        if (isOffline) {
            mWebView.setVisibility(View.GONE);
            mLayoutOffline.setVisibility(View.VISIBLE);
            mProgressBar.setVisibility(View.GONE);
            mSwipeRefresh.setRefreshing(false);
        } else {
            mWebView.setVisibility(View.VISIBLE);
            mLayoutOffline.setVisibility(View.GONE);
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivityManager != null) {
            NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
            return activeNetworkInfo != null && activeNetworkInfo.isConnected();
        }
        return false;
    }

    private void showUrlConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(R.string.dialog_set_url_title);
        builder.setMessage(R.string.dialog_set_url_msg);

        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(mServerUrl);
        builder.setView(input);

        builder.setPositiveButton(R.string.dialog_save, (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (!newUrl.isEmpty()) {
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                    newUrl = "https://" + newUrl;
                }
                mServerUrl = newUrl;
                SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
                editor.putString(KEY_SERVER_URL, mServerUrl);
                editor.apply();
                
                Toast.makeText(MainActivity.this, "URL updated to: " + mServerUrl, Toast.LENGTH_SHORT).show();
                if (mLayoutSplash != null) {
                    mLayoutSplash.setVisibility(View.VISIBLE);
                }
                loadUrl(mServerUrl);
            }
        });

        builder.setNegativeButton(R.string.dialog_cancel, (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void showInitialUrlConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Smart Campus Setup");
        builder.setMessage("Please enter the server website URL to connect:");
        builder.setCancelable(false);

        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://smartcampus.ru.ac.ke");

        int paddingDp = 20;
        float density = getResources().getDisplayMetrics().density;
        int paddingPx = (int)(paddingDp * density);
        FrameLayout container = new FrameLayout(this);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.leftMargin = paddingPx;
        params.rightMargin = paddingPx;
        input.setLayoutParams(params);
        container.addView(input);
        builder.setView(container);

        builder.setPositiveButton("Connect", null);

        final AlertDialog dialog = builder.create();
        dialog.show();

        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String url = input.getText().toString().trim();
            if (url.isEmpty()) {
                input.setError("URL is required");
                return;
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            mServerUrl = url;
            SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
            editor.putString(KEY_SERVER_URL, mServerUrl);
            editor.apply();

            dialog.dismiss();
            if (mLayoutSplash != null) {
                mLayoutSplash.setVisibility(View.VISIBLE);
            }
            loadUrl(mServerUrl);
        });
    }

    private void checkAndRequestPermissions() {
        List<String> permissionsNeeded = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }

        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toArray(new String[0]), REQUEST_CODE_PERMISSIONS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            for (int i = 0; i < permissions.length; i++) {
                String permission = permissions[i];
                int grantResult = grantResults[i];

                if (permission.equals(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    if (grantResult == PackageManager.PERMISSION_GRANTED && mGeoCallback != null && mGeoOrigin != null) {
                        mGeoCallback.invoke(mGeoOrigin, true, false);
                    } else if (mGeoCallback != null && mGeoOrigin != null) {
                        mGeoCallback.invoke(mGeoOrigin, false, false);
                        Toast.makeText(this, "Location permission is required for campus maps and security geofencing.", Toast.LENGTH_LONG).show();
                    }
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != INPUT_FILE_REQUEST_CODE || mFilePathCallback == null) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }

        Uri[] results = null;

        if (resultCode == RESULT_OK) {
            if (data == null || data.getData() == null) {
                // Camera action generated image
                if (mCameraPhotoPath != null) {
                    results = new Uri[]{Uri.parse(mCameraPhotoPath)};
                }
            } else {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
        }

        mFilePathCallback.onReceiveValue(results);
        mFilePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            new AlertDialog.Builder(this)
                    .setTitle("Exit App")
                    .setMessage("Are you sure you want to exit Smart Campus?")
                    .setPositiveButton("Yes", (dialog, which) -> finish())
                    .setNegativeButton("No", null)
                    .show();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mNfcAdapter != null && mNfcScanningEnabled) {
            try {
                mNfcAdapter.enableForegroundDispatch(this, mPendingIntent, null, null);
            } catch (Exception e) {
                Log.e(TAG, "Error enabling NFC foreground dispatch", e);
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mNfcAdapter != null) {
            try {
                mNfcAdapter.disableForegroundDispatch(this);
            } catch (Exception e) {
                Log.e(TAG, "Error disabling NFC foreground dispatch", e);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(intent.getAction()) ||
            NfcAdapter.ACTION_TAG_DISCOVERED.equals(intent.getAction())) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                if (mPendingWritePayload != null) {
                    final boolean success = writeNdefMessage(tag, mPendingWritePayload);
                    mPendingWritePayload = null;
                    runOnUiThread(() -> {
                        mWebView.evaluateJavascript("if (window.AndroidNFC_callback) window.AndroidNFC_callback(" + success + ", '" + (success ? "" : "Failed to write tag") + "');", null);
                    });
                } else {
                    readNdefMessage(tag);
                }
            }
        }
    }

    private boolean writeNdefMessage(Tag tag, String payload) {
        try {
            Ndef ndef = Ndef.get(tag);
            if (ndef != null) {
                ndef.connect();
                if (!ndef.isWritable()) {
                    ndef.close();
                    return false;
                }
                NdefRecord record;
                if (payload.startsWith("http://") || payload.startsWith("https://")) {
                    record = NdefRecord.createUri(payload);
                } else {
                    record = NdefRecord.createTextRecord("en", payload);
                }
                NdefMessage message = new NdefMessage(new NdefRecord[]{record});
                int size = message.toByteArray().length;
                if (ndef.getMaxSize() < size) {
                    ndef.close();
                    return false;
                }
                ndef.writeNdefMessage(message);
                ndef.close();
                return true;
            } else {
                NdefFormatable formatable = NdefFormatable.get(tag);
                if (formatable != null) {
                    formatable.connect();
                    NdefRecord record;
                    if (payload.startsWith("http://") || payload.startsWith("https://")) {
                        record = NdefRecord.createUri(payload);
                    } else {
                        record = NdefRecord.createTextRecord("en", payload);
                    }
                    NdefMessage message = new NdefMessage(new NdefRecord[]{record});
                    formatable.format(message);
                    formatable.close();
                    return true;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error writing NDEF message", e);
        }
        return false;
    }

    private void readNdefMessage(Tag tag) {
        byte[] id = tag.getId();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < id.length; i++) {
            sb.append(String.format("%02x", id[i]));
            if (i < id.length - 1) {
                sb.append(":");
            }
        }
        final String serialNumber = sb.toString();

        String recordsJson = "[]";
        try {
            Ndef ndef = Ndef.get(tag);
            if (ndef != null) {
                ndef.connect();
                NdefMessage message = ndef.getCachedNdefMessage();
                if (message == null) {
                    message = ndef.getNdefMessage();
                }
                if (message != null) {
                    NdefRecord[] records = message.getRecords();
                    org.json.JSONArray jsonArray = new org.json.JSONArray();
                    for (NdefRecord record : records) {
                        org.json.JSONObject obj = new org.json.JSONObject();
                        short tnf = record.getTnf();
                        byte[] type = record.getType();
                        byte[] payload = record.getPayload();
                        
                        String recordType = "unknown";
                        String data = "";
                        
                        if (tnf == NdefRecord.TNF_WELL_KNOWN) {
                            if (java.util.Arrays.equals(type, NdefRecord.RTD_URI)) {
                                recordType = "url";
                                if (payload.length > 0) {
                                    byte prefixCode = payload[0];
                                    String prefix = "";
                                    switch (prefixCode) {
                                        case 0x01: prefix = "http://www."; break;
                                        case 0x02: prefix = "https://www."; break;
                                        case 0x03: prefix = "http://"; break;
                                        case 0x04: prefix = "https://"; break;
                                    }
                                    data = prefix + new String(payload, 1, payload.length - 1, java.nio.charset.StandardCharsets.UTF_8);
                                }
                            } else if (java.util.Arrays.equals(type, NdefRecord.RTD_TEXT)) {
                                recordType = "text";
                                if (payload.length > 0) {
                                    int statusByte = payload[0];
                                    int langCodeLen = statusByte & 0x1F;
                                    data = new String(payload, 1 + langCodeLen, payload.length - 1 - langCodeLen, java.nio.charset.StandardCharsets.UTF_8);
                                }
                            }
                        } else if (tnf == NdefRecord.TNF_ABSOLUTE_URI) {
                            recordType = "url";
                            data = new String(type, java.nio.charset.StandardCharsets.UTF_8);
                        }
                        
                        obj.put("recordType", recordType);
                        obj.put("data", data);
                        jsonArray.put(obj);
                    }
                    recordsJson = jsonArray.toString();
                }
                ndef.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error reading NDEF message", e);
        }
        
        final String finalRecords = recordsJson;
        runOnUiThread(() -> {
            android.os.Vibrator vibrator = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(android.os.VibrationEffect.createOneShot(100, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(100);
                }
            }
            mWebView.evaluateJavascript("if (window.receiveNFCTag) window.receiveNFCTag('" + serialNumber + "', '" + finalRecords.replace("'", "\\'") + "');", null);
        });
    }

    private void injectNdefPolyfill(WebView view) {
        String js = "if (!('NDEFReader' in window)) {\n" +
                "    window.NDEFReader_instances = window.NDEFReader_instances || [];\n" +
                "    window.NDEFReader = class NDEFReader {\n" +
                "        constructor() {\n" +
                "            this.onreading = null;\n" +
                "            this.onreadingerror = null;\n" +
                "            window.NDEFReader_instances.push(this);\n" +
                "        }\n" +
                "        async scan(options) {\n" +
                "            window.AndroidNFC.startScan();\n" +
                "            if (options && options.signal) {\n" +
                "                options.signal.addEventListener('abort', () => {\n" +
                "                    window.AndroidNFC.stopScan();\n" +
                "                    const index = window.NDEFReader_instances.indexOf(this);\n" +
                "                    if (index > -1) window.NDEFReader_instances.splice(index, 1);\n" +
                "                });\n" +
                "            }\n" +
                "            return Promise.resolve();\n" +
                "        }\n" +
                "        async write(message, options) {\n" +
                "            let payload = '';\n" +
                "            if (typeof message === 'string') {\n" +
                "                payload = message;\n" +
                "            } else if (message && message.records) {\n" +
                "                for (let rec of message.records) {\n" +
                "                    if (rec.recordType === 'url') {\n" +
                "                        payload = rec.data;\n" +
                "                        if (payload instanceof Uint8Array) {\n" +
                "                            payload = new TextDecoder().decode(payload);\n" +
                "                        }\n" +
                "                    } else if (rec.recordType === 'text') {\n" +
                "                        payload = rec.data;\n" +
                "                        if (payload instanceof Uint8Array) {\n" +
                "                            payload = new TextDecoder().decode(payload);\n" +
                "                        }\n" +
                "                    }\n" +
                "                }\n" +
                "            }\n" +
                "            return new Promise((resolve, reject) => {\n" +
                "                window.AndroidNFC.writeTag(payload);\n" +
                "                window.AndroidNFC_callback = (success, errorMsg) => {\n" +
                "                    if (success) resolve();\n" +
                "                    else reject(new Error(errorMsg || 'Failed to write NFC tag'));\n" +
                "                };\n" +
                "            });\n" +
                "        }\n" +
                "    };\n" +
                "    window.receiveNFCTag = function(serialNumber, recordsJson) {\n" +
                "        let records = [];\n" +
                "        try {\n" +
                "            records = JSON.parse(recordsJson).map(r => ({\n" +
                "                recordType: r.recordType,\n" +
                "                data: new TextEncoder().encode(r.data)\n" +
                "            }));\n" +
                "        } catch (e) { console.error('Error parsing NFC records', e); }\n" +
                "        const event = {\n" +
                "            serialNumber: serialNumber,\n" +
                "            message: { records: records }\n" +
                "        };\n" +
                "        window.NDEFReader_instances.forEach(reader => {\n" +
                "            if (reader.onreading) {\n" +
                "                try { reader.onreading(event); } catch (e) { console.error(e); }\n" +
                "            }\n" +
                "        });\n" +
                "    };\n" +
                "}";
        view.evaluateJavascript(js, null);
    }

    public class AndroidNFCInterface {
        Context mContext;

        AndroidNFCInterface(Context c) {
            mContext = c;
        }

        @android.webkit.JavascriptInterface
        public void startScan() {
            runOnUiThread(() -> {
                mNfcScanningEnabled = true;
                if (mNfcAdapter != null) {
                    try {
                        mNfcAdapter.enableForegroundDispatch(MainActivity.this, mPendingIntent, null, null);
                        Toast.makeText(mContext, "NFC Scanning Activated. Tap card.", Toast.LENGTH_SHORT).show();
                    } catch (Exception e) {
                        Log.e(TAG, "Error enabling NFC dispatch", e);
                    }
                } else {
                    Toast.makeText(mContext, "NFC Hardware not available on this device", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void stopScan() {
            runOnUiThread(() -> {
                mNfcScanningEnabled = false;
                if (mNfcAdapter != null) {
                    try {
                        mNfcAdapter.disableForegroundDispatch(MainActivity.this);
                    } catch (Exception e) {
                        Log.e(TAG, "Error disabling NFC dispatch", e);
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void writeTag(String payload) {
            mPendingWritePayload = payload;
            runOnUiThread(() -> {
                mNfcScanningEnabled = true;
                if (mNfcAdapter != null) {
                    try {
                        mNfcAdapter.enableForegroundDispatch(MainActivity.this, mPendingIntent, null, null);
                    } catch (Exception e) {
                        Log.e(TAG, "Error enabling NFC dispatch", e);
                    }
                }
                Toast.makeText(mContext, "Tap NFC card/tag to write: " + payload, Toast.LENGTH_LONG).show();
            });
        }
    }
}
