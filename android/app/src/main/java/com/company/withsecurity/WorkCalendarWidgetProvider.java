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
import java.util.Locale;

public class WorkCalendarWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "WorkCalendarWidget";

    public static final String PREFS_NAME = "with_security_widget_prefs";
    public static final String KEY_MONTH_OFFSET = "widget_month_offset";
    public static final String KEY_WORK_DATES_JSON = "widget_work_dates_json";
    public static final String KEY_TODAY_TITLE = "widget_today_title";
    public static final String KEY_TODAY_SITE = "widget_today_site";
    public static final String KEY_TODAY_STATUS = "widget_today_status";
    public static final String KEY_SELECTED_DATE = "widget_selected_date";

    public static final String ACTION_PREV_MONTH = "com.company.withsecurity.ACTION_PREV_MONTH";
    public static final String ACTION_NEXT_MONTH = "com.company.withsecurity.ACTION_NEXT_MONTH";
    public static final String ACTION_REFRESH = "com.company.withsecurity.ACTION_REFRESH";
    public static final String ACTION_SELECT_DATE = "com.company.withsecurity.ACTION_SELECT_DATE";
    public static final String ACTION_OPEN_APP = "com.company.withsecurity.ACTION_OPEN_APP";
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

    private static final int[] TV_WORK_IDS = {
        R.id.tv_work_0, R.id.tv_work_1, R.id.tv_work_2, R.id.tv_work_3, R.id.tv_work_4, R.id.tv_work_5, R.id.tv_work_6,
        R.id.tv_work_7, R.id.tv_work_8, R.id.tv_work_9, R.id.tv_work_10, R.id.tv_work_11, R.id.tv_work_12, R.id.tv_work_13,
        R.id.tv_work_14, R.id.tv_work_15, R.id.tv_work_16, R.id.tv_work_17, R.id.tv_work_18, R.id.tv_work_19, R.id.tv_work_20,
        R.id.tv_work_21, R.id.tv_work_22, R.id.tv_work_23, R.id.tv_work_24, R.id.tv_work_25, R.id.tv_work_26, R.id.tv_work_27,
        R.id.tv_work_28, R.id.tv_work_29, R.id.tv_work_30, R.id.tv_work_31, R.id.tv_work_32, R.id.tv_work_33, R.id.tv_work_34,
        R.id.tv_work_35, R.id.tv_work_36, R.id.tv_work_37, R.id.tv_work_38, R.id.tv_work_39, R.id.tv_work_40, R.id.tv_work_41
    };

    private static final int[] IV_DOT_IDS = {
        R.id.iv_dot_0, R.id.iv_dot_1, R.id.iv_dot_2, R.id.iv_dot_3, R.id.iv_dot_4, R.id.iv_dot_5, R.id.iv_dot_6,
        R.id.iv_dot_7, R.id.iv_dot_8, R.id.iv_dot_9, R.id.iv_dot_10, R.id.iv_dot_11, R.id.iv_dot_12, R.id.iv_dot_13,
        R.id.iv_dot_14, R.id.iv_dot_15, R.id.iv_dot_16, R.id.iv_dot_17, R.id.iv_dot_18, R.id.iv_dot_19, R.id.iv_dot_20,
        R.id.iv_dot_21, R.id.iv_dot_22, R.id.iv_dot_23, R.id.iv_dot_24, R.id.iv_dot_25, R.id.iv_dot_26, R.id.iv_dot_27,
        R.id.iv_dot_28, R.id.iv_dot_29, R.id.iv_dot_30, R.id.iv_dot_31, R.id.iv_dot_32, R.id.iv_dot_33, R.id.iv_dot_34,
        R.id.iv_dot_35, R.id.iv_dot_36, R.id.iv_dot_37, R.id.iv_dot_38, R.id.iv_dot_39, R.id.iv_dot_40, R.id.iv_dot_41
    };

    private static final int[] ROW_IDS = {
        R.id.row_calendar_0, R.id.row_calendar_1, R.id.row_calendar_2,
        R.id.row_calendar_3, R.id.row_calendar_4, R.id.row_calendar_5
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
            Calendar cal = Calendar.getInstance();
            String todayStr = String.format(Locale.KOREA, "%04d-%02d-%02d",
                    cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH));
            prefs.edit()
                    .putInt(KEY_MONTH_OFFSET, 0)
                    .putString(KEY_SELECTED_DATE, todayStr)
                    .apply();
            updateAllWidgets(context);
        } else if (ACTION_SELECT_DATE.equals(action)) {
            // Selecting a date purely updates the widget state without opening the app
            String targetDate = intent.getStringExtra(EXTRA_TARGET_DATE);
            if (targetDate != null && !targetDate.isEmpty()) {
                prefs.edit().putString(KEY_SELECTED_DATE, targetDate).apply();
                updateAllWidgets(context);
            }
        } else if (ACTION_OPEN_APP.equals(action) || ACTION_OPEN_DATE.equals(action)) {
            // Explicit user action to launch app (from top "앱 열기" button or bottom summary card)
            String targetDate = intent.getStringExtra(EXTRA_TARGET_DATE);
            if (targetDate == null || targetDate.isEmpty()) {
                targetDate = prefs.getString(KEY_SELECTED_DATE, "");
            }
            Intent appIntent = new Intent(context, MainActivity.class);
            appIntent.putExtra("targetTab", "workLog");
            if (targetDate != null && !targetDate.isEmpty()) {
                appIntent.putExtra("targetDate", targetDate);
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

            // 2. Currently Selected Date (Defaults to Real Today)
            String selectedDateStr = prefs.getString(KEY_SELECTED_DATE, "");
            if (selectedDateStr.isEmpty()) {
                selectedDateStr = realTodayDateStr;
            }

            // 3. Display Month Calculation based on offset
            int monthOffset = prefs.getInt(KEY_MONTH_OFFSET, 0);
            Calendar displayCal = Calendar.getInstance();
            displayCal.set(Calendar.DAY_OF_MONTH, 1);
            if (monthOffset != 0) {
                displayCal.add(Calendar.MONTH, monthOffset);
            }

            int displayYear = displayCal.get(Calendar.YEAR);
            int displayMonth = displayCal.get(Calendar.MONTH); // 0-based

            views.setTextViewText(R.id.tv_month_title, String.format(Locale.KOREA, "%d년 %d월", displayYear, displayMonth + 1));

            // 4. Parse Stored Work Dates from SharedPreferences
            JSONObject workDatesMap = null;
            String workDatesJson = prefs.getString(KEY_WORK_DATES_JSON, "");
            if (!workDatesJson.isEmpty()) {
                try {
                    workDatesMap = new JSONObject(workDatesJson);
                } catch (Exception e) {
                    Log.w(TAG, "Error parsing work dates JSON", e);
                }
            }

            // 5. Compute Month Days Grid (6 rows x 7 cols = 42 cells)
            int firstDayOfWeek = displayCal.get(Calendar.DAY_OF_WEEK); // 1 = Sunday, 7 = Saturday
            int daysInCurrentMonth = displayCal.getActualMaximum(Calendar.DAY_OF_MONTH);

            Calendar prevMonthCal = (Calendar) displayCal.clone();
            prevMonthCal.add(Calendar.MONTH, -1);
            int daysInPrevMonth = prevMonthCal.getActualMaximum(Calendar.DAY_OF_MONTH);
            int prevYear = prevMonthCal.get(Calendar.YEAR);
            int prevMonth = prevMonthCal.get(Calendar.MONTH);

            Calendar nextMonthCal = (Calendar) displayCal.clone();
            nextMonthCal.add(Calendar.MONTH, 1);
            int nextYear = nextMonthCal.get(Calendar.YEAR);
            int nextMonth = nextMonthCal.get(Calendar.MONTH);

            int startCellIndex = firstDayOfWeek - 1; // 0-indexed column for day 1

            // Dynamically show only the rows needed for this month.
            // Next month days that fall on the same row as this month's end remain visible.
            // Unused week rows (e.g. Row 5 when only 5 rows are needed) are hidden (View.GONE).
            int lastCellIndex = startCellIndex + daysInCurrentMonth - 1;
            int rowsNeeded = (lastCellIndex / 7) + 1; // 4, 5, or 6
            for (int r = 0; r < 6; r++) {
                views.setViewVisibility(ROW_IDS[r], r < rowsNeeded ? View.VISIBLE : View.GONE);
            }

            for (int i = 0; i < 42; i++) {
                int tvDayId = TV_DAY_IDS[i];
                int tvWorkId = TV_WORK_IDS[i];
                int ivDotId = IV_DOT_IDS[i];
                int cellId = CELL_IDS[i];

                if (i < startCellIndex) {
                    // Previous Month Days
                    int dayNum = daysInPrevMonth - (startCellIndex - i - 1);
                    String cellDateStr = String.format(Locale.KOREA, "%04d-%02d-%02d", prevYear, prevMonth + 1, dayNum);
                    boolean isSelected = cellDateStr.equals(selectedDateStr);
                    boolean isHoliday = KoreanHolidays.isHoliday(cellDateStr);

                    views.setTextViewText(tvDayId, String.valueOf(dayNum));

                    if (isSelected) {
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_selected_circle);
                        views.setTextColor(tvDayId, Color.parseColor("#0284C7"));
                    } else {
                        views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                        if (isHoliday) {
                            views.setTextColor(tvDayId, Color.parseColor("#F87171")); // Soft red for prev holiday
                        } else {
                            views.setTextColor(tvDayId, Color.parseColor("#CBD5E1"));
                        }
                    }

                    bindCellWork(views, tvWorkId, ivDotId, cellDateStr, workDatesMap);
                    setCellSelectIntent(context, views, cellId, cellDateStr);
                } else if (i < startCellIndex + daysInCurrentMonth) {
                    // Current Month Days
                    int dayNum = i - startCellIndex + 1;
                    String cellDateStr = String.format(Locale.KOREA, "%04d-%02d-%02d", displayYear, displayMonth + 1, dayNum);
                    boolean isToday = cellDateStr.equals(realTodayDateStr);
                    boolean isSelected = cellDateStr.equals(selectedDateStr);
                    boolean isHoliday = KoreanHolidays.isHoliday(cellDateStr);

                    views.setTextViewText(tvDayId, String.valueOf(dayNum));

                    int col = i % 7;
                    boolean isRedDay = (col == 0 || isHoliday); // Sunday or Korean Public/Alternative Holiday

                    if (isSelected && isToday) {
                        // Today & Selected: Solid primary circle
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_today_circle);
                        views.setTextColor(tvDayId, Color.WHITE);
                    } else if (isSelected) {
                        // Selected Date: Outlined circle
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_selected_circle);
                        views.setTextColor(tvDayId, isRedDay ? Color.parseColor("#DC2626") : Color.parseColor("#0284C7"));
                    } else if (isToday) {
                        // Today: Solid primary circle
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_today_circle);
                        views.setTextColor(tvDayId, Color.WHITE);
                    } else {
                        views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                        if (isRedDay) {
                            views.setTextColor(tvDayId, Color.parseColor("#DC2626")); // Sunday & Holidays (Red)
                        } else if (col == 6) {
                            views.setTextColor(tvDayId, Color.parseColor("#2563EB")); // Saturday (Blue)
                        } else {
                            views.setTextColor(tvDayId, Color.parseColor("#334155")); // Weekday (Dark Gray)
                        }
                    }

                    bindCellWork(views, tvWorkId, ivDotId, cellDateStr, workDatesMap);
                    setCellSelectIntent(context, views, cellId, cellDateStr);
                } else {
                    // Next Month Days
                    int dayNum = i - (startCellIndex + daysInCurrentMonth) + 1;
                    String cellDateStr = String.format(Locale.KOREA, "%04d-%02d-%02d", nextYear, nextMonth + 1, dayNum);
                    boolean isSelected = cellDateStr.equals(selectedDateStr);
                    boolean isHoliday = KoreanHolidays.isHoliday(cellDateStr);

                    views.setTextViewText(tvDayId, String.valueOf(dayNum));

                    if (isSelected) {
                        views.setInt(tvDayId, "setBackgroundResource", R.drawable.widget_selected_circle);
                        views.setTextColor(tvDayId, Color.parseColor("#0284C7"));
                    } else {
                        views.setInt(tvDayId, "setBackgroundColor", Color.TRANSPARENT);
                        if (isHoliday) {
                            views.setTextColor(tvDayId, Color.parseColor("#F87171")); // Soft red for next holiday
                        } else {
                            views.setTextColor(tvDayId, Color.parseColor("#CBD5E1"));
                        }
                    }

                    bindCellWork(views, tvWorkId, ivDotId, cellDateStr, workDatesMap);
                    setCellSelectIntent(context, views, cellId, cellDateStr);
                }
            }

            // 6. Selected Date Work Summary Card at Bottom
            int selYear = realYear, selMonth = realMonth + 1, selDay = realDay;
            try {
                String[] parts = selectedDateStr.split("-");
                if (parts.length == 3) {
                    selYear = Integer.parseInt(parts[0]);
                    selMonth = Integer.parseInt(parts[1]);
                    selDay = Integer.parseInt(parts[2]);
                }
            } catch (Exception ignored) {}

            boolean isSelToday = selectedDateStr.equals(realTodayDateStr);
            String selHolidayName = KoreanHolidays.getHolidayName(selectedDateStr);
            if ((selHolidayName == null || selHolidayName.isEmpty()) && workDatesMap != null && workDatesMap.has(selectedDateStr)) {
                try {
                    JSONObject item = workDatesMap.getJSONObject(selectedDateStr);
                    String h = item.optString("holidayName", "");
                    if (!h.isEmpty()) selHolidayName = h;
                } catch (Exception ignored) {}
            }
            boolean isSelHoliday = (selHolidayName != null && !selHolidayName.isEmpty());

            // Display or hide holiday badge
            if (isSelHoliday) {
                views.setViewVisibility(R.id.tv_holiday_badge, View.VISIBLE);
                views.setTextViewText(R.id.tv_holiday_badge, "🚩 " + selHolidayName);
            } else {
                views.setViewVisibility(R.id.tv_holiday_badge, View.GONE);
            }

            String dateLabel;
            if (isSelToday) {
                dateLabel = isSelHoliday
                        ? String.format(Locale.KOREA, "📌 오늘 (%d월 %d일) [%s]", selMonth, selDay, selHolidayName)
                        : String.format(Locale.KOREA, "📌 오늘 (%d월 %d일) 업무 일정", selMonth, selDay);
            } else {
                dateLabel = isSelHoliday
                        ? String.format(Locale.KOREA, "📌 선택일자 (%d월 %d일) [%s]", selMonth, selDay, selHolidayName)
                        : String.format(Locale.KOREA, "📌 선택일자 (%d월 %d일) 업무 일정", selMonth, selDay);
            }
            views.setTextViewText(R.id.tv_today_date_label, dateLabel);

            String workTitle = "";
            String workSite = "";
            String workStatus = "";
            boolean hasWork = false;

            if (workDatesMap != null && workDatesMap.has(selectedDateStr)) {
                try {
                    JSONObject item = workDatesMap.getJSONObject(selectedDateStr);
                    workTitle = item.optString("title", "");
                    workSite = item.optString("site", "");
                    workStatus = item.optString("status", "업무 등록됨");
                    hasWork = true;
                } catch (Exception e) {
                    hasWork = true;
                }
            } else if (isSelToday) {
                workTitle = prefs.getString(KEY_TODAY_TITLE, "");
                workSite = prefs.getString(KEY_TODAY_SITE, "");
                workStatus = prefs.getString(KEY_TODAY_STATUS, "");
                if (!workTitle.isEmpty() || !workSite.isEmpty()) {
                    hasWork = true;
                }
            }

            if (hasWork) {
                if (workStatus == null || workStatus.isEmpty()) {
                    workStatus = "업무 등록됨";
                }
                views.setTextViewText(R.id.tv_today_status_badge, workStatus);

                if ("TBM 완료".equals(workStatus) || "완료".equals(workStatus)) {
                    views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#16A34A"));
                } else if (workStatus.contains("진행중")) {
                    views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#D97706"));
                } else {
                    views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#0284C7"));
                }

                String combined = "";
                if (!workSite.isEmpty() && !workTitle.isEmpty()) {
                    combined = "[" + workSite + "] " + workTitle;
                } else if (!workTitle.isEmpty()) {
                    combined = workTitle;
                } else if (!workSite.isEmpty()) {
                    combined = "[" + workSite + "] 일일업무";
                } else {
                    combined = "등록된 일일 업무가 있습니다. (터치하여 앱에서 확인)";
                }

                if (isSelHoliday) {
                    combined = combined + " (공휴일 근무)";
                }

                views.setTextViewText(R.id.tv_today_work_content, combined);
            } else {
                if (isSelHoliday) {
                    views.setTextViewText(R.id.tv_today_status_badge, "공휴일 휴무");
                    views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#DC2626"));
                    views.setTextViewText(R.id.tv_today_work_content, selHolidayName + " (공휴일) - 등록된 업무 일지가 없습니다.");
                } else {
                    views.setTextViewText(R.id.tv_today_status_badge, "일정 없음");
                    views.setTextColor(R.id.tv_today_status_badge, Color.parseColor("#94A3B8"));
                    views.setTextViewText(R.id.tv_today_work_content, "해당 일자에 등록된 업무 일지가 없습니다.");
                }
            }

            // 7. Navigation Buttons PendingIntents
            setBroadcastPendingIntent(context, views, R.id.btn_prev_month, ACTION_PREV_MONTH, 101);
            setBroadcastPendingIntent(context, views, R.id.btn_next_month, ACTION_NEXT_MONTH, 102);
            setBroadcastPendingIntent(context, views, R.id.btn_refresh, ACTION_REFRESH, 103);

            // 8. Top "📱 앱 열기" Button PendingIntent -> Launches App with targetDate
            Intent openAppIntent = new Intent(context, WorkCalendarWidgetProvider.class);
            openAppIntent.setAction(ACTION_OPEN_APP);
            openAppIntent.putExtra(EXTRA_TARGET_DATE, selectedDateStr);
            PendingIntent openAppPending = PendingIntent.getBroadcast(
                    context,
                    201,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_open_app, openAppPending);

            // 9. Click Bottom Summary Box -> Open App to selected date
            Intent summaryIntent = new Intent(context, WorkCalendarWidgetProvider.class);
            summaryIntent.setAction(ACTION_OPEN_APP);
            summaryIntent.putExtra(EXTRA_TARGET_DATE, selectedDateStr);
            PendingIntent summaryPending = PendingIntent.getBroadcast(
                    context,
                    202,
                    summaryIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.layout_today_summary, summaryPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Throwable t) {
            Log.e(TAG, "Failed to updateAppWidget ID: " + appWidgetId, t);
        }
    }

    private static void bindCellWork(RemoteViews views, int tvWorkId, int ivDotId, String cellDateStr, JSONObject workDatesMap) {
        String cellWorkText = "";
        String cellCategory = "";

        if (workDatesMap != null && workDatesMap.has(cellDateStr)) {
            JSONObject item = workDatesMap.optJSONObject(cellDateStr);
            if (item != null) {
                cellWorkText = item.optString("cellWorkText", "");
                cellCategory = item.optString("category", "");

                if (cellWorkText.isEmpty()) {
                    String site = item.optString("site", "");
                    if (!site.isEmpty()) {
                        cellWorkText = site;
                        cellCategory = "출장";
                    } else if ("출장 업무".equals(cellCategory) || "출장".equals(cellCategory)) {
                        cellWorkText = "출장지";
                        cellCategory = "출장";
                    } else {
                        cellWorkText = "사내업무";
                        cellCategory = "사내";
                    }
                }

                // Strip redundant "출장" suffix so only site name is shown (e.g. "SKH 이천사업장")
                if ("출장".equals(cellCategory)) {
                    if (cellWorkText.endsWith(" 출장")) {
                        cellWorkText = cellWorkText.substring(0, cellWorkText.length() - 3).trim();
                    } else if (cellWorkText.endsWith("출장") && cellWorkText.length() > 2) {
                        cellWorkText = cellWorkText.substring(0, cellWorkText.length() - 2).trim();
                    }
                }
            }
        }

        if (!cellWorkText.isEmpty()) {
            views.setTextViewText(tvWorkId, cellWorkText);
            views.setViewVisibility(tvWorkId, View.VISIBLE);
            if ("출장".equals(cellCategory)) {
                views.setTextColor(tvWorkId, Color.parseColor("#7C3AED")); // Purple for 출장
                views.setInt(tvWorkId, "setBackgroundResource", R.drawable.widget_work_badge_trip);
            } else {
                views.setTextColor(tvWorkId, Color.parseColor("#0284C7")); // Blue for 사내
                views.setInt(tvWorkId, "setBackgroundResource", R.drawable.widget_work_badge_internal);
            }
            if (ivDotId != 0) views.setViewVisibility(ivDotId, View.GONE);
        } else {
            views.setViewVisibility(tvWorkId, View.GONE);
            if (ivDotId != 0) views.setViewVisibility(ivDotId, View.GONE);
        }
    }

    private static void setCellSelectIntent(Context context, RemoteViews views, int cellId, String dateStr) {
        if (cellId == 0 || dateStr == null) return;
        Intent intent = new Intent(context, WorkCalendarWidgetProvider.class);
        intent.setAction(ACTION_SELECT_DATE);
        intent.putExtra(EXTRA_TARGET_DATE, dateStr);
        int requestCode = 2000 + Math.abs(dateStr.hashCode() % 5000);
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
