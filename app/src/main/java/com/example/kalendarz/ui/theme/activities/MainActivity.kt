package com.example.kalendarz.ui.theme.activities

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.GeolocationPermissions
import android.util.Log
import com.example.kalendarz.R
import com.example.kalendarz.ui.theme.widgets.RotationWidget
import android.content.pm.ActivityInfo
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val LOCATION_PERMISSION_REQUEST = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        // Sprawdź i poproś o uprawnienia
        checkLocationPermissions()

        setupWebView()
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    private fun checkLocationPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {

            Log.d("MainActivity", "❌ Brak uprawnień lokalizacji - proszę o nie")

            ActivityCompat.requestPermissions(this,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ),
                LOCATION_PERMISSION_REQUEST)
        } else {
            Log.d("MainActivity", "✅ Uprawnienia lokalizacji są już przyznane")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            LOCATION_PERMISSION_REQUEST -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d("MainActivity", "✅ Użytkownik przyznał uprawnienia lokalizacji")
                    // Odśwież WebView jeśli potrzeba
                    webView.reload()
                } else {
                    Log.d("MainActivity", "❌ Użytkownik odmówił uprawnień lokalizacji")
                }
            }
        }
    }

    private fun setupWebView() {
        val webSettings: WebSettings = webView.settings

        // Podstawowe ustawienia
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)

        // Geolokalizacja - KLUCZOWE USTAWIENIA!
        webSettings.setGeolocationEnabled(true)
        webSettings.setGeolocationDatabasePath(filesDir.path)

        // Network settings
        webSettings.allowContentAccess = true
        webSettings.allowFileAccess = true
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.allowUniversalAccessFromFileURLs = true
        webSettings.blockNetworkImage = false
        webSettings.blockNetworkLoads = false
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.databaseEnabled = true
        webSettings.userAgentString = webSettings.userAgentString + " KalendarzRotacji/1.0"

        // JavaScript Interface
        webView.addJavascriptInterface(AndroidInterface(), "AndroidWidget")

        // WebViewClient
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url?.contains("openweathermap.org") == true ||
                    url?.contains("api.nbp.pl") == true ||
                    url?.contains("weatherapi.com") == true) {
                    Log.d("MainActivity", "Pozwalam na API call: $url")
                    return false
                }
                return super.shouldOverrideUrlLoading(view, url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("MainActivity", "✅ Strona załadowana: $url")
            }
        }

        // WebChromeClient - OBSŁUGA GEOLOKALIZACJI!
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let { msg ->
                    val level = when(msg.messageLevel()) {
                        ConsoleMessage.MessageLevel.ERROR -> "ERROR"
                        ConsoleMessage.MessageLevel.WARNING -> "WARN"
                        ConsoleMessage.MessageLevel.DEBUG -> "DEBUG"
                        else -> "LOG"
                    }
                    Log.d("WebView_$level", "${msg.message()} [${msg.sourceId()}:${msg.lineNumber()}]")
                }
                return true
            }

            // KLUCZOWA FUNKCJA - obsługa geolokalizacji!
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                Log.d("MainActivity", "🌍 Żądanie uprawnień geolokalizacji dla: $origin")

                // Sprawdź czy aplikacja ma uprawnienia Android
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {

                    Log.d("MainActivity", "✅ Android ma uprawnienia - zatwierdzam dla WebView")
                    callback?.invoke(origin, true, false)
                } else {
                    Log.d("MainActivity", "❌ Android nie ma uprawnień - odmawiam")
                    callback?.invoke(origin, false, false)
                }
            }

            override fun onGeolocationPermissionsHidePrompt() {
                Log.d("MainActivity", "🌍 Ukrycie promptu geolokalizacji")
            }
        }

        // Enable debugging
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }

    inner class AndroidInterface {
        @JavascriptInterface
        fun updateWidgetData(rotationDataJson: String) {
            Log.d("MainActivity", "📊 Otrzymano dane widget: $rotationDataJson")

            try {
                // Sprawdź czy JSON jest prawidłowy
                val jsonObject = org.json.JSONObject(rotationDataJson)
                Log.d("MainActivity", "✅ JSON jest prawidłowy")
                Log.d("MainActivity", "  - currentDays: ${jsonObject.optString("currentDays")}")
                Log.d("MainActivity", "  - currentLabel: ${jsonObject.optString("currentLabel")}")
                Log.d("MainActivity", "  - nextDays: ${jsonObject.optString("nextDays")}")
                Log.d("MainActivity", "  - nextLabel: ${jsonObject.optString("nextLabel")}")

                saveDataForWidget(rotationDataJson)
            } catch (e: Exception) {
                Log.e("MainActivity", "❌ Błąd parsowania JSON widgetu: ${e.message}")
            }
        }

        @JavascriptInterface
        fun logToAndroid(message: String) {
            Log.d("WebView_JS", "📱 $message")
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                android.widget.Toast.makeText(this@MainActivity, message, android.widget.Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun testWidget() {
            Log.d("MainActivity", "🧪 Test widgetu wywołany z JavaScript")
            val testData = """{"currentDays":"TEST","currentLabel":"Test Label","nextDays":"123","nextLabel":"Test Next","lastUpdate":"${java.util.Date()}"}"""
            saveDataForWidget(testData)
        }
    }

    private fun saveDataForWidget(rotationDataJson: String) {
        Log.d("MainActivity", "💾 Zapisuję dane widgetu...")

        val prefs = getSharedPreferences("rotation_data", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("rotation_data", rotationDataJson)
        val success = editor.commit() // Użyj commit() zamiast apply() dla natychmiastowego zapisu

        Log.d("MainActivity", "💾 Zapis do SharedPreferences: ${if (success) "✅ SUKCES" else "❌ BŁĄD"}")

        // Sprawdź czy dane rzeczywiście się zapisały
        val savedData = prefs.getString("rotation_data", null)
        Log.d("MainActivity", "🔍 Sprawdzam zapisane dane: $savedData")

        // Wymuś aktualizację widgetu
        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(this)
        val widgetIds = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(this, com.example.kalendarz.ui.theme.widgets.RotationWidget::class.java)
        )

        Log.d("MainActivity", "🎯 Znaleziono ${widgetIds.size} aktywnych widgetów")

        if (widgetIds.isNotEmpty()) {
            val intent = android.content.Intent(this, com.example.kalendarz.ui.theme.widgets.RotationWidget::class.java)
            intent.action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
            intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
            sendBroadcast(intent)

            Log.d("MainActivity", "📡 Broadcast wysłany do widgetu")
        } else {
            Log.w("MainActivity", "⚠️ Brak aktywnych widgetów - dodaj widget na ekran główny")
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}