package com.company.withsecurity;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeAppLauncherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
