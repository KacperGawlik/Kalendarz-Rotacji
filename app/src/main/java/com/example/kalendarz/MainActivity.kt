package com.example.kalendarz

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true

        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/kalendarz.html")
    }

    // Dodaj do MainActivity
    private fun saveDataForWidget(lastDeparture: String) {
        val prefs = getSharedPreferences("rotation_data", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString("last_departure", lastDeparture)
        editor.apply()

        // Odśwież widget
        val intent = Intent(this, RotationWidget::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        sendBroadcast(intent)
    }
}