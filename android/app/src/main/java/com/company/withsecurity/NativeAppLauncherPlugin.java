package com.company.withsecurity;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAppLauncher")
public class NativeAppLauncherPlugin extends Plugin {

    @PluginMethod
    public void launchApp(PluginCall call) {
        String target = call.getString("target");
        if (target == null || target.trim().isEmpty()) {
            call.reject("Target parameter is required");
            return;
        }

        target = target.trim();
        Context context = getContext();
        PackageManager pm = context.getPackageManager();

        String[] candidates = getCandidates(target);

        for (String candidate : candidates) {
            if (tryLaunchCandidate(context, pm, candidate)) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("launchedTarget", candidate);
                call.resolve(ret);
                return;
            }
        }

        call.reject("Could not launch application for target: " + target);
    }

    @PluginMethod
    public void isAppInstalled(PluginCall call) {
        String target = call.getString("target");
        if (target == null || target.trim().isEmpty()) {
            call.reject("Target parameter is required");
            return;
        }

        target = target.trim();
        Context context = getContext();
        PackageManager pm = context.getPackageManager();

        String[] candidates = getCandidates(target);
        boolean installed = false;

        for (String candidate : candidates) {
            String pkg = extractPackageName(candidate);
            if (pkg != null) {
                try {
                    pm.getPackageInfo(pkg, 0);
                    installed = true;
                    break;
                } catch (PackageManager.NameNotFoundException ignored) {
                }
                if (pm.getLaunchIntentForPackage(pkg) != null) {
                    installed = true;
                    break;
                }
            }

            if (candidate.startsWith("intent://") || candidate.contains("://")) {
                try {
                    Intent intent;
                    if (candidate.startsWith("intent://")) {
                        intent = Intent.parseUri(candidate, Intent.URI_INTENT_SCHEME);
                    } else {
                        intent = new Intent(Intent.ACTION_VIEW, Uri.parse(candidate));
                    }
                    if (pm.queryIntentActivities(intent, 0).size() > 0) {
                        installed = true;
                        break;
                    }
                } catch (Exception ignored) {
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("installed", installed);
        call.resolve(ret);
    }

    private boolean tryLaunchCandidate(Context context, PackageManager pm, String candidate) {
        try {
            Intent intent = null;

            // 1. Try launching by explicit package name if extractable
            String pkgName = extractPackageName(candidate);
            if (pkgName != null) {
                intent = pm.getLaunchIntentForPackage(pkgName);
            }

            // 2. Try parsing intent:// URI scheme
            if (intent == null && candidate.startsWith("intent://")) {
                try {
                    intent = Intent.parseUri(candidate, Intent.URI_INTENT_SCHEME);
                } catch (Exception ignored) {
                }
            }

            // 3. Try parsing custom URI scheme (e.g., ssm://)
            if (intent == null && candidate.contains("://")) {
                try {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse(candidate));
                } catch (Exception ignored) {
                }
            }

            // 4. Try raw candidate string as package name fallback
            if (intent == null && !candidate.contains("://")) {
                intent = pm.getLaunchIntentForPackage(candidate);
            }

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    private String[] getCandidates(String target) {
        String lower = target.toLowerCase();
        if (lower.contains("ssm") || lower.contains("skhynix") || lower.contains("하이닉스")) {
            return new String[] {
                target,
                "com.skhynix.ssm",
                "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end",
                "ssm://",
                "com.skhynix.ssm.mobile",
                "com.skhynix.mobile.ssm"
            };
        } else if (lower.contains("knox") || lower.contains("secapp") || lower.contains("삼성")) {
            return new String[] {
                target,
                "com.sec.knox.app",
                "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.knox.app;end",
                "secapp://",
                "com.samsung.klms"
            };
        } else if (lower.contains("v3") || lower.contains("ahnlab") || lower.contains("안랩")) {
            return new String[] {
                target,
                "com.ahnlab.v3mobile",
                "v3mobile://"
            };
        } else if (lower.contains("lgd") || lower.contains("lg")) {
            return new String[] {
                target,
                "com.lgd.security",
                "lgdsec://"
            };
        } else if (lower.contains("hmg") || lower.contains("현대")) {
            return new String[] {
                target,
                "com.hmg.security",
                "hsec://"
            };
        } else if (lower.contains("posco") || lower.contains("포스코")) {
            return new String[] {
                target,
                "com.posco.security",
                "pososec://"
            };
        }
        return new String[] { target };
    }

    private String extractPackageName(String target) {
        if (target == null) return null;
        if (target.startsWith("package:")) {
            return target.substring(8).trim();
        }
        if (target.contains("package=")) {
            int idx = target.indexOf("package=");
            int endIdx = target.indexOf(";", idx);
            if (endIdx > idx) {
                return target.substring(idx + 8, endIdx).trim();
            } else {
                return target.substring(idx + 8).trim();
            }
        }
        if (!target.contains("://") && target.contains(".")) {
            return target.trim();
        }
        return null;
    }
}
