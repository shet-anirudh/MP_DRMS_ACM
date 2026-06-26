package com.disaster.app;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import java.io.InputStream;

@CapacitorPlugin(
    name = "NearbyPlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "bluetooth",
            strings = {
                "android.permission.BLUETOOTH_SCAN",
                "android.permission.BLUETOOTH_CONNECT",
                "android.permission.BLUETOOTH_ADVERTISE"
            }
        ),
        @Permission(
            alias = "wifi",
            strings = {
                "android.permission.NEARBY_WIFI_DEVICES"
            }
        )
    }
)
public class NearbyPlugin extends Plugin {

    private static final String TAG = "NearbyPlugin";
    private static final int LARGE_PAYLOAD_THRESHOLD = 32 * 1024; // 32 KB

    private final ConcurrentHashMap<Long, byte[]> pendingPayloads = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> endpointPayloadMap = new ConcurrentHashMap<>();

    private final ConnectionLifecycleCallback connectionLifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String endpointId, ConnectionInfo info) {
            Log.d(TAG, "Connection initiated from " + endpointId + " (" + info.getEndpointName() + ")");
            Nearby.getConnectionsClient(getContext())
                .acceptConnection(endpointId, payloadCallback)
                .addOnFailureListener(e -> Log.e(TAG, "Failed to accept connection from " + endpointId, e));
        }

        @Override
        public void onConnectionResult(String endpointId, ConnectionResolution result) {
            boolean accepted = result.getStatus().getStatusCode() == ConnectionsStatusCodes.STATUS_OK;
            Log.d(TAG, "Connection result for " + endpointId + ": accepted=" + accepted);
            JSObject event = new JSObject();
            event.put("endpointId", endpointId);
            event.put("accepted", accepted);
            event.put("statusCode", result.getStatus().getStatusCode());
            notifyListeners("nearbyConnectionResult", event);
        }

        @Override
        public void onDisconnected(String endpointId) {
            Log.d(TAG, "Disconnected from " + endpointId);
            endpointPayloadMap.remove(endpointId);
            JSObject event = new JSObject();
            event.put("endpointId", endpointId);
            notifyListeners("nearbyDisconnected", event);
        }
    };

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(String endpointId, DiscoveredEndpointInfo info) {
            Log.d(TAG, "Endpoint found: " + endpointId + " (" + info.getEndpointName() + ")");
            JSObject event = new JSObject();
            event.put("endpointId", endpointId);
            event.put("name", info.getEndpointName());
            notifyListeners("nearbyPeerFound", event);
        }

        @Override
        public void onEndpointLost(String endpointId) {
            Log.d(TAG, "Endpoint lost: " + endpointId);
            JSObject event = new JSObject();
            event.put("endpointId", endpointId);
            notifyListeners("nearbyPeerLost", event);
        }
    };

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String endpointId, Payload payload) {
            Log.d(TAG, "Payload received from " + endpointId + ", type=" + payload.getType());
            if (payload.getType() == Payload.Type.BYTES) {
                byte[] bytes = payload.asBytes();
                if (bytes != null) {
                    emitPayload(endpointId, bytes);
                }
            } else if (payload.getType() == Payload.Type.STREAM) {
                endpointPayloadMap.put(endpointId, payload.getId());
                try {
                    InputStream inputStream = payload.asStream().asInputStream();
                    // In Java, we need to read the stream.
                    // This is simple for small payloads, but beware of large streams in memory
                    byte[] bytes = readAllBytes(inputStream);
                    if (bytes != null) {
                        emitPayload(endpointId, bytes);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error reading stream payload from " + endpointId, e);
                }
            } else {
                Log.w(TAG, "Unsupported payload type: " + payload.getType());
            }
        }

        @Override
        public void onPayloadTransferUpdate(String endpointId, PayloadTransferUpdate update) {
            String statusStr;
            switch (update.getStatus()) {
                case PayloadTransferUpdate.Status.SUCCESS:
                    statusStr = "SUCCESS";
                    break;
                case PayloadTransferUpdate.Status.FAILURE:
                    statusStr = "FAILURE";
                    break;
                case PayloadTransferUpdate.Status.CANCELED:
                    statusStr = "CANCELED";
                    break;
                case PayloadTransferUpdate.Status.IN_PROGRESS:
                    statusStr = "IN_PROGRESS";
                    break;
                default:
                    statusStr = "UNKNOWN";
                    break;
            }
            Log.d(TAG, "Transfer update [" + endpointId + "]: status=" + statusStr + " bytes=" + update.getBytesTransferred() + "/" + update.getTotalBytes());

            JSObject event = new JSObject();
            event.put("endpointId", endpointId);
            event.put("payloadId", update.getPayloadId());
            event.put("status", statusStr);
            event.put("bytesTransferred", update.getBytesTransferred());
            event.put("totalBytes", update.getTotalBytes());
            notifyListeners("nearbyPayloadTransferUpdate", event);
        }
    };

    private byte[] readAllBytes(InputStream inputStream) {
        try {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            buffer.flush();
            return buffer.toByteArray();
        } catch (Exception e) {
            Log.e(TAG, "Failed to read stream", e);
            return null;
        }
    }

    @PluginMethod
    public void checkPlayServices(PluginCall call) {
        GoogleApiAvailability availability = GoogleApiAvailability.getInstance();
        int result = availability.isGooglePlayServicesAvailable(getContext());
        boolean available = (result == ConnectionResult.SUCCESS);
        JSObject ret = new JSObject();
        ret.put("available", available);
        ret.put("errorCode", result);
        call.resolve(ret);
    }

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String deviceName = call.getString("deviceName");
        if (deviceName == null) {
            call.reject("deviceName is required");
            return;
        }
        String serviceId = call.getString("serviceId");
        if (serviceId == null) {
            call.reject("serviceId is required");
            return;
        }

        AdvertisingOptions advertisingOptions = new AdvertisingOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER)
            .build();

        Nearby.getConnectionsClient(getContext())
            .startAdvertising(deviceName, serviceId, connectionLifecycleCallback, advertisingOptions)
            .addOnSuccessListener(unused -> {
                Log.d(TAG, "Advertising started as '" + deviceName + "' on '" + serviceId + "'");
                call.resolve();
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "startAdvertising failed", e);
                call.reject("startAdvertising failed: " + e.getMessage(), e);
            });
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        Nearby.getConnectionsClient(getContext()).stopAdvertising();
        Log.d(TAG, "Advertising stopped");
        call.resolve();
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        String serviceId = call.getString("serviceId");
        if (serviceId == null) {
            call.reject("serviceId is required");
            return;
        }

        DiscoveryOptions discoveryOptions = new DiscoveryOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER)
            .build();

        Nearby.getConnectionsClient(getContext())
            .startDiscovery(serviceId, endpointDiscoveryCallback, discoveryOptions)
            .addOnSuccessListener(unused -> {
                Log.d(TAG, "Discovery started on '" + serviceId + "'");
                call.resolve();
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "startDiscovery failed", e);
                call.reject("startDiscovery failed: " + e.getMessage(), e);
            });
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        Nearby.getConnectionsClient(getContext()).stopDiscovery();
        Log.d(TAG, "Discovery stopped");
        call.resolve();
    }

    @PluginMethod
    public void requestConnection(PluginCall call) {
        String endpointId = call.getString("endpointId");
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }
        String deviceName = call.getString("deviceName");
        if (deviceName == null) {
            deviceName = "MP-DRMS-Device";
        }

        Nearby.getConnectionsClient(getContext())
            .requestConnection(deviceName, endpointId, connectionLifecycleCallback)
            .addOnSuccessListener(unused -> {
                Log.d(TAG, "Connection request sent to " + endpointId);
                call.resolve();
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "requestConnection failed for " + endpointId, e);
                call.reject("requestConnection failed: " + e.getMessage(), e);
            });
    }

    @PluginMethod
    public void sendPayload(PluginCall call) {
        String endpointId = call.getString("endpointId");
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }

        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        Payload payload;
        if (bytes.length <= LARGE_PAYLOAD_THRESHOLD) {
            Log.d(TAG, "Sending BYTES payload (" + bytes.length + " bytes) to " + endpointId);
            payload = Payload.fromBytes(bytes);
        } else {
            Log.d(TAG, "Sending STREAM payload (" + bytes.length + " bytes) to " + endpointId);
            payload = Payload.fromStream(new ByteArrayInputStream(bytes));
        }

        Nearby.getConnectionsClient(getContext())
            .sendPayload(endpointId, payload)
            .addOnSuccessListener(unused -> {
                Log.d(TAG, "Payload sent successfully to " + endpointId);
                call.resolve();
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "sendPayload failed for " + endpointId, e);
                call.reject("sendPayload failed: " + e.getMessage(), e);
            });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String endpointId = call.getString("endpointId");
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }
        Nearby.getConnectionsClient(getContext()).disconnectFromEndpoint(endpointId);
        endpointPayloadMap.remove(endpointId);
        Log.d(TAG, "Disconnected from " + endpointId);
        call.resolve();
    }

    @PluginMethod
    public void stopAllEndpoints(PluginCall call) {
        Nearby.getConnectionsClient(getContext()).stopAllEndpoints();
        endpointPayloadMap.clear();
        pendingPayloads.clear();
        Log.d(TAG, "All endpoints stopped");
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            Nearby.getConnectionsClient(getContext()).stopAllEndpoints();
        } catch (Exception e) {
            Log.e(TAG, "Cleanup on destroy failed", e);
        }
    }

    private void emitPayload(String endpointId, byte[] bytes) {
        String json;
        try {
            json = new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            Log.e(TAG, "Failed to decode payload bytes from " + endpointId, e);
            return;
        }
        JSObject event = new JSObject();
        event.put("endpointId", endpointId);
        event.put("json", json);
        notifyListeners("nearbyPayloadReceived", event);
    }
}
