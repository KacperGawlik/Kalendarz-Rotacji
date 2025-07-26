package com.example.kalendarz.ui.theme.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.util.Log
import com.example.kalendarz.R
import org.json.JSONObject

class RotationWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d("RotationWidget", "🔄 onUpdate() wywołane dla ${appWidgetIds.size} widgetów")

        // Update each widget
        for (appWidgetId in appWidgetIds) {
            Log.d("RotationWidget", "📊 Aktualizuję widget ID: $appWidgetId")
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        Log.d("RotationWidget", "🎯 updateAppWidget() dla ID: $appWidgetId")

        // Create RemoteViews
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Load data from SharedPreferences
        val prefs = context.getSharedPreferences("rotation_data", Context.MODE_PRIVATE)
        val rotationDataJson = prefs.getString("rotation_data", null)

        Log.d("RotationWidget", "📂 Dane z SharedPreferences: $rotationDataJson")

        if (rotationDataJson != null && rotationDataJson.isNotEmpty()) {
            try {
                val json = JSONObject(rotationDataJson)

                val currentDays = json.optString("currentDays", "--")
                val currentLabel = json.optString("currentLabel", "dni do powrotu")
                val nextDays = json.optString("nextDays", "--")
                val nextLabel = json.optString("nextLabel", "dni do wylotu")
                val lastUpdate = json.optString("lastUpdate", "")

                Log.d("RotationWidget", "📊 Parsowane dane:")
                Log.d("RotationWidget", "  - currentDays: $currentDays")
                Log.d("RotationWidget", "  - currentLabel: $currentLabel")
                Log.d("RotationWidget", "  - nextDays: $nextDays")
                Log.d("RotationWidget", "  - nextLabel: $nextLabel")
                Log.d("RotationWidget", "  - lastUpdate: $lastUpdate")

                views.setTextViewText(R.id.widget_current_days, currentDays)
                views.setTextViewText(R.id.widget_current_label, currentLabel)
                views.setTextViewText(R.id.widget_next_days, nextDays)
                views.setTextViewText(R.id.widget_next_label, nextLabel)

                Log.d("RotationWidget", "✅ Dane ustawione w widgecie")

            } catch (e: Exception) {
                Log.e("RotationWidget", "❌ Błąd parsowania JSON: ${e.message}")
                setDefaultValues(views)
            }
        } else {
            Log.w("RotationWidget", "⚠️ Brak danych w SharedPreferences - używam wartości domyślnych")
            setDefaultValues(views)
        }

        // Update widget
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("RotationWidget", "✅ Widget ID $appWidgetId zaktualizowany pomyślnie")
        } catch (e: Exception) {
            Log.e("RotationWidget", "❌ Błąd aktualizacji widgetu: ${e.message}")
        }
    }

    private fun setDefaultValues(views: RemoteViews) {
        Log.d("RotationWidget", "🔧 Ustawiam wartości domyślne")

        views.setTextViewText(R.id.widget_current_days, "--")
        views.setTextViewText(R.id.widget_current_label, "dni do powrotu")
        views.setTextViewText(R.id.widget_next_days, "--")
        views.setTextViewText(R.id.widget_next_label, "dni do wylotu")
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("RotationWidget", "🎉 Widget włączony")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("RotationWidget", "🚫 Widget wyłączony")
    }

    override fun onReceive(context: Context, intent: android.content.Intent) {
        super.onReceive(context, intent)
        Log.d("RotationWidget", "📨 Otrzymano intent: ${intent.action}")

        when (intent.action) {
            AppWidgetManager.ACTION_APPWIDGET_UPDATE -> {
                Log.d("RotationWidget", "🔄 Otrzymano żądanie aktualizacji widgetu")

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val widgetIds = AppWidgetManager.getInstance(context)
                    .getAppWidgetIds(android.content.ComponentName(context, RotationWidget::class.java))

                if (widgetIds.isNotEmpty()) {
                    onUpdate(context, appWidgetManager, widgetIds)
                } else {
                    Log.w("RotationWidget", "⚠️ Brak aktywnych widgetów do aktualizacji")
                }
            }
        }
    }
}