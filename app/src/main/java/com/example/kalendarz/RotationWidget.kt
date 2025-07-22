package com.example.kalendarz

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject

class RotationWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update each widget
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Create RemoteViews
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Load data from SharedPreferences
        val prefs = context.getSharedPreferences("rotation_data", Context.MODE_PRIVATE)
        val rotationDataJson = prefs.getString("rotation_data", null)

        if (rotationDataJson != null) {
            try {
                val json = JSONObject(rotationDataJson)
                val currentDays = json.optString("currentDays", "--")
                val currentLabel = json.optString("currentLabel", "dni do powrotu")
                val nextDays = json.optString("nextDays", "--")
                val nextLabel = json.optString("nextLabel", "dni do wylotu")

                views.setTextViewText(R.id.widget_current_days, currentDays)
                views.setTextViewText(R.id.widget_current_label, currentLabel)
                views.setTextViewText(R.id.widget_next_days, nextDays)
                views.setTextViewText(R.id.widget_next_label, nextLabel)

            } catch (e: Exception) {
                // Fallback to default values if error occurs
                setDefaultValues(views)
            }
        } else {
            // No data available
            setDefaultValues(views)
        }

        // Update widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun setDefaultValues(views: RemoteViews) {
        views.setTextViewText(R.id.widget_current_days, "--")
        views.setTextViewText(R.id.widget_current_label, "dni do powrotu")
        views.setTextViewText(R.id.widget_next_days, "--")
        views.setTextViewText(R.id.widget_next_label, "dni do wylotu")
    }
}