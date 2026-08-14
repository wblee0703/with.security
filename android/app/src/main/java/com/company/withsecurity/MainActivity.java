package com.company.withsecurity;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAppLauncherPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            Window window = getWindow();
            window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#04070e"));
            window.setNavigationBarColor(Color.parseColor("#070c17"));

            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                // false = light (white) text/icons for status bar & navigation bar on dark background
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
