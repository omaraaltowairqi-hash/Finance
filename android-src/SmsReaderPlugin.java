package com.daftari.almali;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Capacitor plugin مخصص لقراءة رسائل SMS الواردة (صندوق الوارد) محلياً على الجهاز.
 * لا يرسل أي بيانات لأي خادم — القراءة تتم داخل التطبيق فقط.
 */
@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_SMS }, alias = "sms")
    }
)
public class SmsReaderPlugin extends Plugin {

    /** التحقق من حالة صلاحية قراءة الرسائل */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    /** طلب صلاحية قراءة الرسائل من المستخدم */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("sms", call, "smsPermCallback");
    }

    @PermissionCallback
    private void smsPermCallback(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    /**
     * قراءة الرسائل من صندوق الوارد.
     * المعاملات الاختيارية:
     *   - limit (int): أقصى عدد رسائل (افتراضي 200)
     *   - sinceTimestamp (long): قراءة الرسائل الأحدث من هذا الوقت فقط (ميلي ثانية)
     * تُرجع: { messages: [{ address, body, date }] }
     */
    @PluginMethod
    public void readInbox(PluginCall call) {
        if (ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_SMS
            ) != PackageManager.PERMISSION_GRANTED) {
            call.reject("PERMISSION_DENIED");
            return;
        }

        int limit = call.getInt("limit", 200);
        long since = 0L;
        if (call.getData().has("sinceTimestamp")) {
            try {
                since = call.getData().getLong("sinceTimestamp");
            } catch (Exception ignored) {}
        }

        JSONArray messages = new JSONArray();
        Cursor cursor = null;
        try {
            Uri inbox = Uri.parse("content://sms/inbox");
            String selection = null;
            String[] selectionArgs = null;
            if (since > 0) {
                selection = "date > ?";
                selectionArgs = new String[] { String.valueOf(since) };
            }
            cursor = getContext().getContentResolver().query(
                inbox,
                new String[] { "_id", "address", "body", "date" },
                selection,
                selectionArgs,
                "date DESC"
            );

            if (cursor != null) {
                int addrIdx = cursor.getColumnIndex("address");
                int bodyIdx = cursor.getColumnIndex("body");
                int dateIdx = cursor.getColumnIndex("date");
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    JSONObject msg = new JSONObject();
                    msg.put("address", addrIdx >= 0 ? cursor.getString(addrIdx) : "");
                    msg.put("body", bodyIdx >= 0 ? cursor.getString(bodyIdx) : "");
                    msg.put("date", dateIdx >= 0 ? cursor.getLong(dateIdx) : 0L);
                    messages.put(msg);
                    count++;
                }
            }
        } catch (Exception e) {
            call.reject("READ_ERROR: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) cursor.close();
        }

        JSObject ret = new JSObject();
        try {
            ret.put("messages", messages);
        } catch (Exception e) {
            call.reject("SERIALIZE_ERROR: " + e.getMessage());
            return;
        }
        call.resolve(ret);
    }
}
