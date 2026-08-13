package com.company.withsecurity;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebViewClient originalClient = webView.getWebViewClient();

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (uri != null) {
                        String url = uri.toString();
                        // Intercept intent: or custom security app schemes
                        if (url.startsWith("intent:") || url.startsWith("ssm:") || url.startsWith("secapp:") || url.startsWith("v3mobile:") || url.startsWith("lgdsec:") || url.startsWith("hsec:") || url.startsWith("pososec:")) {
                            try {
                                Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                                if (intent != null) {
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                    return true;
                                }
                            } catch (Exception e) {
                                // Fallback launcher by package name if intent parsing fails
                                String pkg = uri.getQueryParameter("package");
                                if (pkg == null || pkg.isEmpty()) {
                                    if (url.contains("ssm") || url.contains("skhynix")) {
                                        pkg = "com.skhynix.ssm";
                                    } else if (url.contains("secapp") || url.contains("knox")) {
                                        pkg = "com.sec.knox.app";
                                    } else if (url.contains("v3")) {
                                        pkg = "com.ahnlab.v3mobile";
                                    }
                                }

                                if (pkg != null && !pkg.isEmpty()) {
                                    try {
                                        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(pkg);
                                        if (launchIntent == null && pkg.equals("com.skhynix.ssm")) {
                                            launchIntent = getPackageManager().getLaunchIntentForPackage("com.skhynix.ssm.mobile");
                                        }
                                        if (launchIntent != null) {
                                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                            startActivity(launchIntent);
                                            return true;
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }
                        }
                    }
                    if (originalClient != null) {
                        return originalClient.shouldOverrideUrlLoading(view, request);
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }
}
