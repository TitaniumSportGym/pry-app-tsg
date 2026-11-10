'use strict';

// An OkHttp observer, not a TLS implementation. Uses RN's unchanged default
// builder and trust manager. Only the anonymous GET /health is logged.
function labDiagnosticsSource(lab) {
  return `package ${lab.package}

import android.content.Context
import android.util.Log
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.IOException
import java.security.cert.CertificateException
import okhttp3.Call
import okhttp3.EventListener
import okhttp3.Handshake
import okhttp3.Response

internal object TitaniumPinningLabDiagnostics {
  private const val TAG = "TitaniumPinningLab"

  fun install(context: Context) {
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(context)
        .eventListenerFactory { call ->
          val request = call.request()
          val url = request.url
          if (request.method != "GET" || url.scheme != "https" ||
              url.host != "${lab.host}" || url.port != 443 ||
              url.encodedPath != "/health" || url.encodedQuery != null) {
            EventListener.NONE
          } else {
            object : EventListener() {
              override fun callStart(call: Call) {
                Log.i(TAG, "HEALTH_START variant=${lab.variant}")
              }

              override fun secureConnectEnd(call: Call, handshake: Handshake?) {
                Log.i(TAG, "TLS_HANDSHAKE_OK host=${lab.host}")
              }

              override fun responseHeadersEnd(call: Call, response: Response) {
                Log.i(TAG, "HTTP_RESPONSE status=" + response.code)
              }

              override fun callFailed(call: Call, ioe: IOException) {
                var cause: Throwable? = ioe
                var pinFailed = false
                var depth = 0
                while (cause != null && depth++ < 12) {
                  if (cause is CertificateException && cause.message?.contains("Pin verification failed") == true) pinFailed = true
                  cause = cause.cause
                }
                val result = if (pinFailed) "PIN_VERIFICATION_FAILED" else "CONNECTION_FAILED"
                // No headers, body, JWT, query strings or response contents.
                Log.e(TAG, result + " host=${lab.host} type=" + ioe.javaClass.simpleName, ioe)
              }
            }
          }
        }
        .build()
    }
  }
}
`;
}

module.exports = { labDiagnosticsSource };
