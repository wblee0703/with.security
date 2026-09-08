package com.company.withsecurity;

import java.util.HashMap;
import java.util.Map;

/**
 * 대한민국 공휴일 및 대체공휴일 정적 데이터 (2024년 ~ 2030년)
 */
public class KoreanHolidays {

    private static final Map<String, String> HOLIDAYS = new HashMap<>();

    static {
        // --- 2024년 ---
        HOLIDAYS.put("2024-01-01", "신정");
        HOLIDAYS.put("2024-02-09", "설날연휴");
        HOLIDAYS.put("2024-02-10", "설날");
        HOLIDAYS.put("2024-02-11", "설날연휴");
        HOLIDAYS.put("2024-02-12", "대체공휴일");
        HOLIDAYS.put("2024-03-01", "삼일절");
        HOLIDAYS.put("2024-04-10", "국회의원선거");
        HOLIDAYS.put("2024-05-05", "어린이날");
        HOLIDAYS.put("2024-05-06", "대체공휴일");
        HOLIDAYS.put("2024-05-15", "부처님오신날");
        HOLIDAYS.put("2024-06-06", "현충일");
        HOLIDAYS.put("2024-08-15", "광복절");
        HOLIDAYS.put("2024-09-16", "추석연휴");
        HOLIDAYS.put("2024-09-17", "추석");
        HOLIDAYS.put("2024-09-18", "추석연휴");
        HOLIDAYS.put("2024-10-01", "국군의날");
        HOLIDAYS.put("2024-10-03", "개천절");
        HOLIDAYS.put("2024-10-09", "한글날");
        HOLIDAYS.put("2024-12-25", "성탄절");

        // --- 2025년 ---
        HOLIDAYS.put("2025-01-01", "신정");
        HOLIDAYS.put("2025-01-27", "임시공휴일");
        HOLIDAYS.put("2025-01-28", "설날연휴");
        HOLIDAYS.put("2025-01-29", "설날");
        HOLIDAYS.put("2025-01-30", "설날연휴");
        HOLIDAYS.put("2025-03-01", "삼일절");
        HOLIDAYS.put("2025-03-03", "대체공휴일");
        HOLIDAYS.put("2025-05-05", "어린이날");
        HOLIDAYS.put("2025-05-06", "부처님오신날");
        HOLIDAYS.put("2025-06-06", "현충일");
        HOLIDAYS.put("2025-08-15", "광복절");
        HOLIDAYS.put("2025-10-03", "개천절");
        HOLIDAYS.put("2025-10-05", "추석연휴");
        HOLIDAYS.put("2025-10-06", "추석");
        HOLIDAYS.put("2025-10-07", "추석연휴");
        HOLIDAYS.put("2025-10-08", "대체공휴일");
        HOLIDAYS.put("2025-10-09", "한글날");
        HOLIDAYS.put("2025-12-25", "성탄절");

        // --- 2026년 ---
        HOLIDAYS.put("2026-01-01", "신정");
        HOLIDAYS.put("2026-02-16", "설날연휴");
        HOLIDAYS.put("2026-02-17", "설날");
        HOLIDAYS.put("2026-02-18", "설날연휴");
        HOLIDAYS.put("2026-03-01", "삼일절");
        HOLIDAYS.put("2026-03-02", "대체공휴일");
        HOLIDAYS.put("2026-05-05", "어린이날");
        HOLIDAYS.put("2026-05-24", "부처님오신날");
        HOLIDAYS.put("2026-05-25", "대체공휴일");
        HOLIDAYS.put("2026-06-03", "지방선거");
        HOLIDAYS.put("2026-06-06", "현충일");
        HOLIDAYS.put("2026-08-15", "광복절");
        HOLIDAYS.put("2026-08-17", "대체공휴일");
        HOLIDAYS.put("2026-09-24", "추석연휴");
        HOLIDAYS.put("2026-09-25", "추석");
        HOLIDAYS.put("2026-09-26", "추석연휴");
        HOLIDAYS.put("2026-10-03", "개천절");
        HOLIDAYS.put("2026-10-05", "대체공휴일");
        HOLIDAYS.put("2026-10-09", "한글날");
        HOLIDAYS.put("2026-12-25", "성탄절");

        // --- 2027년 ---
        HOLIDAYS.put("2027-01-01", "신정");
        HOLIDAYS.put("2027-02-06", "설날연휴");
        HOLIDAYS.put("2027-02-07", "설날");
        HOLIDAYS.put("2027-02-08", "설날연휴");
        HOLIDAYS.put("2027-02-09", "대체공휴일");
        HOLIDAYS.put("2027-03-01", "삼일절");
        HOLIDAYS.put("2027-05-05", "어린이날");
        HOLIDAYS.put("2027-05-13", "부처님오신날");
        HOLIDAYS.put("2027-06-06", "현충일");
        HOLIDAYS.put("2027-08-15", "광복절");
        HOLIDAYS.put("2027-08-16", "대체공휴일");
        HOLIDAYS.put("2027-09-14", "추석연휴");
        HOLIDAYS.put("2027-09-15", "추석");
        HOLIDAYS.put("2027-09-16", "추석연휴");
        HOLIDAYS.put("2027-10-03", "개천절");
        HOLIDAYS.put("2027-10-04", "대체공휴일");
        HOLIDAYS.put("2027-10-09", "한글날");
        HOLIDAYS.put("2027-10-11", "대체공휴일");
        HOLIDAYS.put("2027-12-25", "성탄절");
        HOLIDAYS.put("2027-12-27", "대체공휴일");

        // --- 2028년 ---
        HOLIDAYS.put("2028-01-01", "신정");
        HOLIDAYS.put("2028-01-26", "설날연휴");
        HOLIDAYS.put("2028-01-27", "설날");
        HOLIDAYS.put("2028-01-28", "설날연휴");
        HOLIDAYS.put("2028-03-01", "삼일절");
        HOLIDAYS.put("2028-04-12", "국회의원선거");
        HOLIDAYS.put("2028-05-02", "부처님오신날");
        HOLIDAYS.put("2028-05-05", "어린이날");
        HOLIDAYS.put("2028-06-06", "현충일");
        HOLIDAYS.put("2028-08-15", "광복절");
        HOLIDAYS.put("2028-10-02", "추석연휴");
        HOLIDAYS.put("2028-10-03", "개천절/추석");
        HOLIDAYS.put("2028-10-04", "추석연휴");
        HOLIDAYS.put("2028-10-05", "대체공휴일");
        HOLIDAYS.put("2028-10-09", "한글날");
        HOLIDAYS.put("2028-12-25", "성탄절");

        // --- 2029년 ---
        HOLIDAYS.put("2029-01-01", "신정");
        HOLIDAYS.put("2029-02-12", "설날연휴");
        HOLIDAYS.put("2029-02-13", "설날");
        HOLIDAYS.put("2029-02-14", "설날연휴");
        HOLIDAYS.put("2029-03-01", "삼일절");
        HOLIDAYS.put("2029-05-05", "어린이날");
        HOLIDAYS.put("2029-05-07", "대체공휴일");
        HOLIDAYS.put("2029-05-20", "부처님오신날");
        HOLIDAYS.put("2029-05-21", "대체공휴일");
        HOLIDAYS.put("2029-06-06", "현충일");
        HOLIDAYS.put("2029-08-15", "광복절");
        HOLIDAYS.put("2029-09-21", "추석연휴");
        HOLIDAYS.put("2029-09-22", "추석");
        HOLIDAYS.put("2029-09-23", "추석연휴");
        HOLIDAYS.put("2029-09-24", "대체공휴일");
        HOLIDAYS.put("2029-10-03", "개천절");
        HOLIDAYS.put("2029-10-09", "한글날");
        HOLIDAYS.put("2029-12-25", "성탄절");

        // --- 2030년 ---
        HOLIDAYS.put("2030-01-01", "신정");
        HOLIDAYS.put("2030-02-02", "설날연휴");
        HOLIDAYS.put("2030-02-03", "설날");
        HOLIDAYS.put("2030-02-04", "설날연휴");
        HOLIDAYS.put("2030-03-01", "삼일절");
        HOLIDAYS.put("2030-05-05", "어린이날");
        HOLIDAYS.put("2030-05-06", "대체공휴일");
        HOLIDAYS.put("2030-05-09", "부처님오신날");
        HOLIDAYS.put("2030-06-06", "현충일");
        HOLIDAYS.put("2030-08-15", "광복절");
        HOLIDAYS.put("2030-09-11", "추석연휴");
        HOLIDAYS.put("2030-09-12", "추석");
        HOLIDAYS.put("2030-09-13", "추석연휴");
        HOLIDAYS.put("2030-10-03", "개천절");
        HOLIDAYS.put("2030-10-09", "한글날");
        HOLIDAYS.put("2030-12-25", "성탄절");
    }

    public static String getHolidayName(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        return HOLIDAYS.get(dateStr);
    }

    public static boolean isHoliday(String dateStr) {
        return getHolidayName(dateStr) != null;
    }
}
