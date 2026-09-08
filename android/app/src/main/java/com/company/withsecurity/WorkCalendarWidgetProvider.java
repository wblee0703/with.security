package com.company.withsecurity;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

public class WorkCalendarWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "WorkCalendarWidget";

    public static final String PREFS_NAME = "with_security_widget_prefs";
    public static final String KEY_MONTH_OFFSET = "widget_month_offset";
    public static final String KEY_WORK_DATES_JSON = "widget_work_dates_json";
    public static final String KEY_TODAY_TITLE = "widget_today_title";
    public static final String KEY_TODAY_SITE = "widget_today_site";
    public static final String KEY_TODAY_STATUS = "widget_today_status";

    public static final String ACTION_PREV_MONTH = "com.company.withsecurity.ACTION_PREV_MONTH";
    public static final String ACTION_NEXT_MONTH = "com.company.withsecurity.ACTION_NEXT_MONTH";
    public static final String ACTION_REFRESH = "com.company.withsecurity.ACTION_REFRESH";
    public static final String ACTION_OPEN_DATE = "com.company.withsecurity.ACTION_OPEN_DATE";
    public static final String EXTRA_TARGET_DATE = "extra_target_date";

    // Predefined static resource IDs for fast, crash-free RemoteViews mapping (42 cells)
    private static final int[] CELL_IDS = {
        R.id.cell_0, R.id.cell_1, R.id.cell_2, R.id.cell_3, R.id.cell_4, R.id.cell_5, R.id.cell_6,
        R.id.cell_7, R.id.cell_8, R.id.cell_9, R.id.cell_10, R.id.cell_11, R.id.cell_12, R.id.cell_13,
        R.id.cell_14, R.id.cell_15, R.id.cell_16, R.id.cell_17, R.id.cell_18, R.id.cell_19, R.id.cell_20,
        R.id.cell_21, R.id.cell_22, R.id.cell_23, R.id.cell_24, R.id.cell_25, R.id.cell_26, R.id.cell_27,
        R.id.cell_28, R.id.cell_29, R.id.cell_30, R.id.cell_31, R.id.cell_32, R.id.cell_33, R.id.cell_34,
        R.id.cell_35, R.id.cell_36, R.id.cell_37, R.id.cell_38, R.id.cell_39, R.id.cell_40, R.id.cell_41
    };

    private static final int[] TV_DAY_IDS = {
        R.id.tv_day_0, R.id.tv_day_1, R.id.tv_day_2, R.id.tv_day_3, R.id.tv_day_4, R.id.tv_day_5, R.id.tv_day_6,
        R.id.tv_day_7, R.id.tv_day_8, R.id.tv_day_9, R.id.tv_day_10, R.id.tv_day_11, R.id.tv_day_12, R.id.tv_day_13,
        R.id.tv_day_14, R.id.tv_day_15, R.id.tv_day_16, R.id.tv_day_17, R.id.tv_day_18, R.id.tv_day_19, R.id.tv_day_20,
        R.id.tv_day_21, R.id.tv_day_22, R.id.tv_day_23, R.id.tv_day_24, R.id.tv_day_25, R.id.tv_day_26, R.id.tv_day_27,
        R.id.tv_day_28, R.id.tv_day_29, R.id.tv_day_30, R.id.tv_day_31, R.id.tv_day_32, R.id.tv_day_33, R.id.tv_day_34,
        R.id.tv_day_35, R.id.tv_day_36, R.id.tv_day_37, R.id.tv_day_38, R.id.tv_day_39, R.id.tv_day_40, R.id.tv_day_41
    };

    private static final int[] IV_DOT_IDS = {
        R.id.iv_dot_0, R.id.iv_dot_1, R.id.iv_dot_2, R.id.iv_dot_3, R.id.iv_dot_4, R.id.iv_dot_5, R.id.iv_dot_6,
        R.id.iv_dot_7, R.id.iv_dot_8, R.id.iv_dot_9, R.id.iv_dot_10, R.id.iv_dot_11, R.id.iv_dot_12, R.id.iv_dot_13,
        R.id.iv_dot_14, R.id.iv_dot_15, R.id.iv_dot_16, R.id.iv_dot_17, R.id.iv_dot_18, R.id.iv_dot_19, R.id.iv_dot_20,
        R.id.iv_dot_21, R.id.iv_dot_22, R.id.iv_dot_23, R.id.iv_dot_24, R.id.iv_dot_25, R.id.iv_dot_26, R.id.iv_dot_27,
        R.id.iv_dot_28, R.id.iv_dot_29, R.id.iv_dot_30, R.id.iv_dot_31, R.id.iv_dot_32, R.id.iv_dot_33, R.id.iv_dot_34,
        R.id.iv_dot_35, R.id.iv_dot_36, R.id.iv_dot_37, R.id.iv_dot_38, R.id.iv_dot_39, R.id.iv_dot_40, R.id.iv_dot_41
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        if (ACTION_PREV_MONTH.equals(action)) {
            int offset = prefs.getInt(KEY_MONTH_OFFSET, 0);
            prefs.edit().putInt(KEY_MONTH_OFFSET, offset - 1).apply();
            updateAllWidgets(context);
        } else if (ACTION_NEXT_MONTH.equals(action)) {
            int offset = prefs.getInt(KEY_MONTH_OFFSET, 0);
            prefs.edit().putInt(KEY_MONTH_OFFSET, offset + 1).apply();
            updateAllWidgets(context);
        } else if (ACTION_REFRESH.equals(action)) {
            prefs.edit().putInt(KEY_MONTH_OFFSET, 0).apply();
            updateAllWidgets(context);
        } else if (ACTION_OPEN_DATE.equals(action)) {
            String date = intent.getStringExtra(EXTRA_TARGET_DATE);
            Intent appIntent = new Intent(context, MainActivity.class);
            appIntent.putExtra("targetTab", "workLog");
            if (date != null && !date.isEmpty()) {
                appIntent.putExtra("targetDate", date);
            }
            appIntent.putExtra("fromWidget", true);
            appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(appIntent);
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, WorkCalendarWidgetProvider.class);
            int[] appWidgetIds = manager.getAppWidgetIds(componentName);
            for (int id : appWidgetIds) {
                updateAppWidget(context, manager, id);
            }
        } catch (Throwable t) {
            Log.e(TAG, "Failed to updateAllWidgets", t);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);

            // 1. Calculate Real Today
            Calendar realTodayCal = Calendar.getInstance();
            int realYear = realTodayCal.get(Calendar.YEAR);
            int realMonth = realTodayCal.get(Calendar.MONTH);
            int realDay = realTodayCal.get(Calendar.DAY_OF_MONTH);
            String realTodayDateStr = String.format(Locale.KOREA, "%04d-%02d-%02d", realYear, realMonth + 1, realDay);

            // 2. Display Month Calculation based on offset
            int monthOffset = prefs.getInt(KEY_MONTH_OFFSET, 0);
            Calendar displayCal = Calendar.getInstance();
            displayCal.set(Calendar.DAY_OF_MONTH, 1);
            if (monthOffset != 0) {
                displayCal.add(Calendar.MONTH, monthOffset);
            }

            int displayYear = displayCal.get(Calendar.YEAR);
            int displayMonth = displayCal.get(Calendar.MONTH); // 0-based

            views.setTextViewText(R.id.tv_month_title, String.format(Locale.KOREA, "%d년 %d월", displayYear, displayMonth + 1));

            // 3. Parse Stored Work Dates from SharedPreferences
            Set<String> workDateSet = new HashSet<>();
            String workDatesJson = prefs.getString(KEY_WORK_DATES_JSON, "");
            if (!workDatesJson.isEmpty()) {
                try {
                    JSONObject json = new JSONObject(workDatesJson);
                    Iterator<String> keys = json.keys();
                    while (keys.hasNext()) {
                        workDateSet.add(keys.next());
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Error parsing work dates JSON", e);
                }
            }

            // 4. Compute Month Days Grid (6 rows x 7 cols = 42 cells)
            int firstDayOfWeek = displayCal.get(Calendar.DAY_OF_WEEK); // 1 = Sunday, 7 = Saturday
            int daysInCurrentMonth = displayCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            Calendar prevMonthCal = (Calendar) displayCal.clone();
            prevMonthCal.add(Calendar.MONTH, -1);
            int daysInPrevMonth = prevMonthCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            int startCellIndex = firstDayOfWeek - 1; // 0-indexed column for day 1

            for (int i = 0; i < 42; i++) {
                int tvDayId = TV_DAY_IDS[i];
                int ivDotId = IV_DOT_IDS[i];
                int cellId = CELL_IDS[i];

                if (i < startCellIndex) {
                    // Prev Month Days
                    int dayNum = daysInPrevMonth - (startCellIndex - i - 1);
                    views.setTextViewText(tvDayId, String.valueOf(dayNum));
                    views.setTextColor(tvDayId, Color.parseColor("#CBD5E1"));
                    views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                    views.setViewVisibility(ivDotId, View.GONE);

                    // Setup Click to Open Calendar
                    setCellClickIntent(context, views, cellId, null);
                } else if (i < startCellIndex + daysInCurrentMonth) {
                    // Current Month Days
                    int dayNum = i - startCellIndex + 1;
                    String dateStr = String.format(Locale.KOREA, "%04d-%02d-%02d", displayYear, displayMonth + 1, dayNum);
                    boolean isToday = (displayYear == realYear && displayMonth == realMonth && dayNum == realDay);
                    boolean hasWork = workDateSet.contains(dateStr);

                    views.setTextViewText(tvDayId, String.valueOf(dayNum));

                    int col = i % 7;
                    if (isToday) {
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_today_circle);
                        views.setTextColor(tvDayId, Color.WHITE);
                    } else {
                        views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                        if (col == 0) {
                            views.setTextColor(tvDayId, Color.parseColor("#DC2626")); // Sunday
                        } else if (col == 6) {
                            views.setTextColor(tvDayId, Color.parseColor("#2563EB")); // Saturday
                        } else {
                            views.setTextColor(tvDayId, Color.parseColor("#334155")); // Weekday
                        }
                    }

                    views.setViewVisibility(ivDotId, hasWork ? View.VISIBLE : View.GONE);
                    setCellClickIntent(context, views, cellId, dateStr);
                } else {
                    // Next Month Days
                    int dayNum = i - (startCellIndex + daysInCurrentMonth) + 1;
                    views.setTextViewText(tvDayId, String.valueOf(dayNum));
                    views.setTextColor(tvDayId, Color.parseColor("#CBD5E1"));
                    views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                    views.setViewVisibility(ivDotId, View.GONE);

                    setCellClickIntent(context, views, cellId, null);
                }
            }

            // 5. Today's Summary Card
            String todayTitle = prefs.getString(KEY_TODAY_TITLE, "");
            String todaySite = prefs.getString(KEY_TODAY_SITE, "");
            String todayStatus = prefs.getString(KEY_TODAY_STATUS, "점검 대기");

            views.setTextViewText(R.id.tv_today_date_label, String.format(Locale.KOREA, "📌 오늘 (%d월 %d일)", realMonth + 1, realDay));
            views.setTextViewText(R.id.tv_today_status_badge, todayStatus);

            if ("TBM 완료".equals(todayStatus) || "완료".equals(todayStatus)) {
                views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#16A34A"));
            } else {
                views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#D97706"));
            }

            if (!todayTitle.isEmpty() || !todaySite.isEmpty()) {
                String combined = todaySite.isEmpty() ? todayTitle : ("[" + todaySite + "] " + todayTitle);
                views.setTextViewText(R.id.tv_today_work_content, combined);
            } else {
                views.setTextViewText(R.id.tv_today_work_content, "등록된 일일업무를 확인하려면 터치하세요");
            }

            // 6. Navigation Buttons PendingIntents
            setBroadcastPendingIntent(context, views, R.id.btn_prev_month, ACTION_PREV_MONTH, 101);
            setBroadcastPendingIntent(context, views, R.id.btn_next_month, ACTION_NEXT_MONTH, 102);
            setBroadcastPendingIntent(context, views, R.id.btn_refresh, ACTION_REFRESH, 103);

            // 7. Click Summary Box -> Open App to WorkLog
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.putExtra("targetTab", "workLog");
            openAppIntent.putExtra("targetDate", realTodayDateStr);
            openAppIntent.putExtra("fromWidget", true);
            openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent summaryPending = PendingIntent.getActivity(
                    context,
                    200,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.layout_today_summary, summaryPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            Log.e(TAG, "Failed to updateAppWidget ID: " + appWidgetId, t);
        }
    }

    private static void setCellClickIntent(Context context, RemoteViews views, int cellId, String dateStr) {
        if (cellId == 0) return;
        Intent intent = new Intent(context, WorkCalendarWidgetProvider.class);
        intent.setAction(ACTION_OPEN_DATE);
        if (dateStr != null) {
            intent.putExtra(EXTRA_TARGET_DATE, dateStr);
        }
        int requestCode = 1000 + (dateStr != null ? dateStr.hashCode() : cellId);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(cellId, pendingIntent);
    }

    private static void setBroadcastPendingIntent(Context context, RemoteViews views, int viewId, String action, int requestCode) {
        Intent intent = new Intent(context, WorkCalendarWidgetProvider.class);
        intent.setAction(action);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(viewId, pendingIntent);
    }
}
