package com.company.withsecurity;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "NativeAppLauncher")
public class NativeAppLauncherPlugin extends Plugin {

    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text");
        String title = call.getString("title", "업무 보고서 공유");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Text parameter is required");
            return;
        }

        try {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            sendIntent.setType("text/plain");

            Intent shareIntent = Intent.createChooser(sendIntent, title);
            shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(shareIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Share failed: " + e.getMessage());
        }
    }

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

        // Final fallback: search all installed launcher apps matching keywords
        String fallbackPackage = findMatchingInstalledApp(pm, target);
        if (fallbackPackage != null && tryLaunchPackage(context, pm, fallbackPackage)) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("launchedTarget", fallbackPackage);
            call.resolve(ret);
            return;
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

        if (!installed) {
            installed = findMatchingInstalledApp(pm, target) != null;
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
        Set<String> addedPackages = new HashSet<>();

        try {
            // 1. Query all Launcher Activities
            Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
            mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> resolveInfos = pm.queryIntentActivities(mainIntent, 0);

            for (ResolveInfo ri : resolveInfos) {
                if (ri.activityInfo == null) continue;
                String pkgName = ri.activityInfo.packageName;
                if (pkgName == null || addedPackages.contains(pkgName)) continue;

                String pLower = pkgName.toLowerCase();
                String label = "";
                try {
                    CharSequence cs = ri.loadLabel(pm);
                    label = cs != null ? cs.toString() : pkgName;
                } catch (Exception e) {
                    label = pkgName;
                }
                String lLower = label.toLowerCase();

                boolean isTarget = pLower.contains("ssm") || pLower.contains("hynix") ||
                                  pLower.contains("knox") || pLower.contains("sds") || pLower.contains("mdm") ||
                                  pLower.contains("samsung") || pLower.contains("moplus") || pLower.contains("semi") ||
                                  pLower.contains("deviceon") || pLower.contains("lgd") ||
                                  pLower.contains("lgdisplay") || pLower.contains("v3") || pLower.contains("ahnlab") ||
                                  pLower.contains("security") || pLower.contains("guard") ||
                                  lLower.contains("보안") || lLower.contains("ssm") || lLower.contains("knox") ||
                                  lLower.contains("디바이스온") || lLower.contains("deviceon") || lLower.contains("mdm") ||
                                  lLower.contains("협력사") || lLower.contains("출입");

                if (isTarget) {
                    addedPackages.add(pkgName);
                    JSObject item = new JSObject();
                    item.put("packageName", pkgName);
                    item.put("label", label);
                    item.put("scheme", "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=" + pkgName + ";end");
                    appsList.put(item);
                }
            }

            // 2. Query all installed packages
            List<PackageInfo> packages = pm.getInstalledPackages(0);
            for (PackageInfo pkg : packages) {
                if (addedPackages.contains(pkg.packageName)) continue;
                String pName = pkg.packageName.toLowerCase();
                if (pName.contains("ssm") || pName.contains("hynix") || pName.contains("knox") ||
                    pName.contains("sds") || pName.contains("mdm") || pName.contains("samsung.sec") ||
                    pName.contains("moplus") || pName.contains("semi") ||
                    pName.contains("deviceon") || pName.contains("lgd") || pName.contains("lgdisplay") ||
                    pName.contains("v3") || pName.contains("ahnlab") || pName.contains("security")) {
                    
                    addedPackages.add(pkg.packageName);
                    JSObject item = new JSObject();
                    item.put("packageName", pkg.packageName);
                    try {
                        CharSequence label = pm.getApplicationLabel(pkg.applicationInfo);
                        item.put("label", label != null ? label.toString() : pkg.packageName);
                    } catch (Exception e) {
                        item.put("label", pkg.packageName);
                    }
                    item.put("scheme", "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=" + pkg.packageName + ";end");
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

        if (candidate.equalsIgnoreCase("camera") || candidate.equalsIgnoreCase("android.media.action.STILL_IMAGE_CAMERA") || candidate.contains("STILL_IMAGE_CAMERA") || candidate.equalsIgnoreCase("android.media.action.IMAGE_CAPTURE")) {
            try {
                Intent camIntent = new Intent(android.provider.MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA);
                camIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                camIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                if (camIntent.resolveActivity(pm) != null) {
                    context.startActivity(camIntent);
                    return true;
                } else {
                    Intent capIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
                    capIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(capIntent);
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        try {
            Intent intent = null;

            // 1. Try direct package name launching
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

            // 3. Try custom scheme (e.g. ssm://, deviceon://, knox://)
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

            // C. If still null, inspect PackageInfo activities
            if (intent == null) {
                try {
                    PackageInfo pkgInfo = pm.getPackageInfo(pkgName, PackageManager.GET_ACTIVITIES);
                    if (pkgInfo != null && pkgInfo.activities != null && pkgInfo.activities.length > 0) {
                        for (ActivityInfo act : pkgInfo.activities) {
                            if (act.exported || act.name.toLowerCase().contains("main") || 
                                act.name.toLowerCase().contains("splash") || act.name.toLowerCase().contains("init") || 
                                act.name.toLowerCase().contains("security") || act.name.toLowerCase().contains("device") ||
                                act.name.toLowerCase().contains("mdm") || act.name.toLowerCase().contains("login")) {
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

        // 1. SK Hynix SSM candidates
        if (lower.contains("ssm") || lower.contains("skhynix") || lower.contains("하이닉스") || lower.contains("hynix")) {
            list.add("com.skhynix.ssm");
            list.add("com.skhynix.ssm.mobile");
            list.add("com.skhynix.mobile.ssm");
            list.add("com.skhynix.smartsecurity");
            list.add("kr.co.skhynix.ssm");
            list.add("com.skhynix.sec");
            list.add("com.skhynix.ssm.agent");
            list.add("com.skhynix.ssm.android");
            list.add("com.skhynix.ssm2");
            list.add("com.sk.ssm");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end");
            list.add("ssm://");
            list.add("skhynixssm://");
        }

        // 2. Samsung MDM / Knox / Partner MDM candidates
        if (lower.contains("knox") || lower.contains("secapp") || lower.contains("삼성") || lower.contains("samsung") || lower.contains("mdm") || lower.contains("sds") || lower.contains("협력사") || lower.contains("moplus") || lower.contains("semi")) {
            list.add("com.moplus.samsung.semi.user"); // Samsung Partner MDM (com.moplus.samsung.semi.user)
            list.add("com.moplus.samsung.semi");
            list.add("com.moplus.samsung");
            list.add("com.sds.emp.mobile.mdm"); // Samsung SDS Mobile MDM
            list.add("com.sds.emp.mobile");
            list.add("com.sds.mdm");
            list.add("com.sds.emm.agent");
            list.add("com.samsung.sec.android.mdm");
            list.add("com.sec.knox.app");
            list.add("com.samsung.klms");
            list.add("com.samsung.android.mdm");
            list.add("com.samsung.mdm");
            list.add("kr.co.samsung.mdm");
            list.add("com.sec.enterprise.knox.attestation");
            list.add("com.sec.knox.kss");
            list.add("com.sec.knox.switcher");
            list.add("com.sec.android.app.controlagent");
            list.add("com.samsung.knox.manage");
            list.add("com.samsung.sec.mdm");
            list.add("com.samsung.mobile.security");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.moplus.samsung.semi.user;end");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sds.emp.mobile.mdm;end");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.knox.app;end");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.samsung.sec.android.mdm;end");
            list.add("secapp://");
            list.add("knox://");
            list.add("samsungmdm://");
        }

        // 3. LGD DeviceOn (LG디스플레이 디바이스온) candidates
        if (lower.contains("lgd") || lower.contains("디바이스온") || lower.contains("deviceon") || lower.contains("lg") || lower.contains("엘지") || lower.contains("lgdisplay")) {
            list.add("com.lgd.deviceon");
            list.add("com.lgdisplay.deviceon");
            list.add("com.lgd.deviceon.mobile");
            list.add("kr.co.lgd.deviceon");
            list.add("kr.co.lgdisplay.deviceon");
            list.add("com.lgd.security");
            list.add("com.lgdisplay.security");
            list.add("com.lgdisplay.mobile.deviceon");
            list.add("com.lg.deviceon");
            list.add("com.lg.mdm");
            list.add("com.lgcns.deviceon");
            list.add("com.lgcns.mdm");
            list.add("com.lg.security");
            list.add("com.lg.deviceguard");
            list.add("com.lgcns.smartsecurity");
            list.add("com.lgd.mobile");
            list.add("com.lgdisplay.mobile");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.lgd.deviceon;end");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.lgdisplay.deviceon;end");
            list.add("intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.lgd.security;end");
            list.add("deviceon://");
            list.add("lgddeviceon://");
            list.add("lgdsec://");
        }

        // 4. AhnLab V3 Mobile Enterprise
        if (lower.contains("v3") || lower.contains("ahnlab") || lower.contains("안랩")) {
            list.add("com.ahnlab.v3mobile");
            list.add("com.ahnlab.v3mobileplus");
            list.add("com.ahnlab.v3mobileenterprise");
            list.add("v3mobile://");
        }

        return list;
    }

    private String findMatchingInstalledApp(PackageManager pm, String target) {
        if (target == null || target.trim().isEmpty()) return null;
        String lower = target.toLowerCase();

        try {
            Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
            mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> resolveInfos = pm.queryIntentActivities(mainIntent, 0);

            for (ResolveInfo ri : resolveInfos) {
                if (ri.activityInfo == null) continue;
                String pkgName = ri.activityInfo.packageName;
                if (pkgName == null) continue;
                String pLower = pkgName.toLowerCase();

                CharSequence labelCs = ri.loadLabel(pm);
                String label = labelCs != null ? labelCs.toString().toLowerCase() : "";

                // Check Samsung Knox / MDM / 협력사 MDM match
                if (lower.contains("knox") || lower.contains("삼성") || lower.contains("samsung") || lower.contains("mdm") || lower.contains("협력사") || lower.contains("moplus") || lower.contains("semi")) {
                    if (pLower.contains("com.moplus.samsung.semi.user") || pLower.contains("moplus") ||
                        label.contains("협력사 mdm") || label.contains("협력사mdm") || label.contains("협력사") ||
                        pLower.contains("knox") || pLower.contains("sds") || pLower.contains("mdm") ||
                        (pLower.contains("samsung") && (pLower.contains("sec") || pLower.contains("agent") || pLower.contains("security") || pLower.contains("semi"))) ||
                        label.contains("knox") || label.contains("mdm") || (label.contains("삼성") && label.contains("보안"))) {
                        return pkgName;
                    }
                }

                // Check LG Display DeviceOn match
                if (lower.contains("lgd") || lower.contains("디바이스온") || lower.contains("deviceon") || lower.contains("lg")) {
                    if (pLower.contains("deviceon") || pLower.contains("lgd") || pLower.contains("lgdisplay") ||
                        label.contains("디바이스온") || label.contains("deviceon") || label.contains("lgd")) {
                        return pkgName;
                    }
                }

                // Check SK Hynix SSM match
                if (lower.contains("ssm") || lower.contains("하이닉스") || lower.contains("hynix")) {
                    if (pLower.contains("ssm") || pLower.contains("hynix") || label.contains("ssm") || label.contains("하이닉스")) {
                        return pkgName;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
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
