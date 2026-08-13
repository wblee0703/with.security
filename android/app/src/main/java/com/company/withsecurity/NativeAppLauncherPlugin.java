package com.company.withsecurity;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

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

        List<String> candidates = getCandidates(pm, target);

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

        List<String> candidates = getCandidates(pm, target);
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

    @PluginMethod
    public void scanSecurityApps(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        JSArray appsList = new JSArray();

        try {
            List<PackageInfo> packages = pm.getInstalledPackages(0);
            for (PackageInfo pkg : packages) {
                String pName = pkg.packageName.toLowerCase();
                if (pName.contains("ssm") || pName.contains("hynix") || pName.contains("knox") ||
                    pName.contains("v3") || pName.contains("ahnlab") || pName.contains("security") ||
                    pName.contains("sec") || pName.contains("guard") || pName.contains("mdm")) {
                    JSObject item = new JSObject();
                    item.put("packageName", pkg.packageName);
                    try {
                        CharSequence label = pm.getApplicationLabel(pkg.applicationInfo);
                        item.put("label", label != null ? label.toString() : pkg.packageName);
                    } catch (Exception e) {
                        item.put("label", pkg.packageName);
                    }
                    appsList.put(item);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        JSObject ret = new JSObject();
        ret.put("apps", appsList);
        call.resolve(ret);
    }

    private boolean tryLaunchCandidate(Context context, PackageManager pm, String candidate) {
        if (candidate == null || candidate.trim().isEmpty()) return false;
        candidate = candidate.trim();

        try {
            Intent intent = null;

            // 1. Try direct package name launching (handles both launcher and non-launcher activities)
            String pkgName = extractPackageName(candidate);
            if (pkgName != null) {
                if (tryLaunchPackage(context, pm, pkgName)) {
                    return true;
                }
            }

            // 2. Try parsing intent:// URI scheme
            if (candidate.startsWith("intent://")) {
                try {
                    intent = Intent.parseUri(candidate, Intent.URI_INTENT_SCHEME);
                } catch (Exception ignored) {
                }
            }

            // 3. Try custom scheme (e.g. ssm://, skhynixssm://)
            if (intent == null && candidate.contains("://")) {
                try {
                    intent = new Intent(Intent.ACTION_VIEW, Uri.parse(candidate));
                } catch (Exception ignored) {
                }
            }

            // 4. Fallback: try raw candidate string as package name
            if (intent == null && !candidate.contains("://")) {
                if (tryLaunchPackage(context, pm, candidate)) {
                    return true;
                }
            }

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(intent);
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    private boolean tryLaunchPackage(Context context, PackageManager pm, String pkgName) {
        try {
            // A. Standard launch intent
            Intent intent = pm.getLaunchIntentForPackage(pkgName);

            // B. If getLaunchIntentForPackage returns null, query MAIN activities for package
            if (intent == null) {
                Intent mainQuery = new Intent(Intent.ACTION_MAIN, null);
                mainQuery.setPackage(pkgName);
                List<ResolveInfo> resolveInfos = pm.queryIntentActivities(mainQuery, 0);
                if (resolveInfos != null && !resolveInfos.isEmpty()) {
                    ActivityInfo act = resolveInfos.get(0).activityInfo;
                    intent = new Intent(Intent.ACTION_MAIN);
                    intent.setClassName(act.packageName, act.name);
                }
            }

            // C. If still null, inspect all PackageInfo activities and launch first/main activity
            if (intent == null) {
                try {
                    PackageInfo pkgInfo = pm.getPackageInfo(pkgName, PackageManager.GET_ACTIVITIES);
                    if (pkgInfo != null && pkgInfo.activities != null && pkgInfo.activities.length > 0) {
                        for (ActivityInfo act : pkgInfo.activities) {
                            if (act.exported || act.name.toLowerCase().contains("main") || 
                                act.name.toLowerCase().contains("splash") || act.name.toLowerCase().contains("init") || 
                                act.name.toLowerCase().contains("security") || act.name.toLowerCase().contains("login")) {
                                intent = new Intent();
                                intent.setClassName(pkgName, act.name);
                                break;
                            }
                        }
                        if (intent == null) {
                            intent = new Intent();
                            intent.setClassName(pkgName, pkgInfo.activities[0].name);
                        }
                    }
                } catch (Exception ignored) {
                }
            }

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(intent);
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    private List<String> getCandidates(PackageManager pm, String target) {
        List<String> list = new ArrayList<>();
        if (target != null && !target.trim().isEmpty()) {
            list.add(target.trim());
        }

        String lower = target != null ? target.toLowerCase() : "";

        if (lower.contains("ssm") || lower.contains("skhynix") || lower.contains("하이닉스")) {
            list.add("com.skhynix.ssm");
            list.add("com.skhynix.ssm.mobile");
            list.add("com.skhynix.mobile.ssm");
            list.add("com.skhynix.smartsecurity");
            list.add("com.skhynix.sec");
            list.add("com.skhynix.ssm.agent");
            list.add("com.skhynix.ssm.android");
            list.add("com.skhynix.ssm2");
            list.add("kr.co.skhynix.ssm");
            list.add("com.sk.ssm");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end");
            list.add("ssm://");
            list.add("skhynixssm://");

            // Dynamic Scan for installed packages on the user's device matching ssm or hynix
            try {
                List<PackageInfo> installed = pm.getInstalledPackages(0);
                for (PackageInfo pkg : installed) {
                    String pName = pkg.packageName.toLowerCase();
                    if (pName.contains("ssm") || pName.contains("hynix")) {
                        if (!list.contains(pkg.packageName)) {
                            list.add(pkg.packageName);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        } else if (lower.contains("knox") || lower.contains("secapp") || lower.contains("삼성")) {
            list.add("com.sec.knox.app");
            list.add("com.samsung.klms");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.knox.app;end");
            list.add("secapp://");

            try {
                List<PackageInfo> installed = pm.getInstalledPackages(0);
                for (PackageInfo pkg : installed) {
                    String pName = pkg.packageName.toLowerCase();
                    if (pName.contains("knox") || pName.contains("secapp")) {
                        if (!list.contains(pkg.packageName)) {
                            list.add(pkg.packageName);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        } else if (lower.contains("v3") || lower.contains("ahnlab") || lower.contains("안랩")) {
            list.add("com.ahnlab.v3mobile");
            list.add("v3mobile://");

            try {
                List<PackageInfo> installed = pm.getInstalledPackages(0);
                for (PackageInfo pkg : installed) {
                    String pName = pkg.packageName.toLowerCase();
                    if (pName.contains("v3") || pName.contains("ahnlab")) {
                        if (!list.contains(pkg.packageName)) {
                            list.add(pkg.packageName);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        } else if (lower.contains("lgd") || lower.contains("lg")) {
            list.add("com.lgd.security");
            list.add("lgdsec://");
        } else if (lower.contains("hmg") || lower.contains("현대")) {
            list.add("com.hmg.security");
            list.add("hsec://");
        } else if (lower.contains("posco") || lower.contains("포스코")) {
            list.add("com.posco.security");
            list.add("pososec://");
        }
        return list;
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
