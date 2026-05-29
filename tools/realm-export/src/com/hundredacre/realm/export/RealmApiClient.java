package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HTTP client for Hundred Acre Realm session allocate + bundle upload APIs.
 */
public class RealmApiClient {
	private static final Pattern SESSION_ID = Pattern.compile("\"sessionId\"\\s*:\\s*\"([^\"]+)\"");
	private static final int MAX_REDIRECTS = 5;

	private final String baseUrl;
	private final String apiKey;

	public RealmApiClient(String baseUrl, String apiKey) {
		this.baseUrl = InstallSettings.normalizeSiteUrl(baseUrl);
		this.apiKey = apiKey;
	}

	public AllocateResponse allocate(RealmIdentity identity) throws IOException {
		java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
		body.put("realmKey", identity.realmKey);
		body.put("realmKeySource", identity.realmKeySource);
		if (identity.gameTitle != null) body.put("gameTitle", identity.gameTitle);
		java.util.Map<String, Object> id = GameIdentityExtractor.toManifestMap(identity);
		body.put("identity", id);

		String json = JsonUtil.toJson(body);
		String response = postJson("/api/realm/v1/sessions/allocate", json);
		return parseAllocate(response);
	}

	public void uploadBundle(String sessionId, File zipFile) throws IOException {
		String url = baseUrl + "/api/realm/v1/sessions/" + sessionId + "/bundle";
		sendRequest("PUT", url, conn -> {
			conn.setDoOutput(true);
			conn.setRequestProperty("Content-Type", "application/zip");
			try (OutputStream out = conn.getOutputStream();
					FileInputStream in = new FileInputStream(zipFile)) {
				byte[] buf = new byte[8192];
				int n;
				while ((n = in.read(buf)) > 0) {
					out.write(buf, 0, n);
				}
			}
		}, "Upload");
	}

	private String postJson(String path, String json) throws IOException {
		return sendRequest("POST", baseUrl + path, conn -> {
			conn.setDoOutput(true);
			conn.setRequestProperty("Content-Type", "application/json");
			conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));
		}, "Allocate");
	}

	@FunctionalInterface
	private interface ConnectionConfigurer {
		void configure(HttpURLConnection conn) throws IOException;
	}

	private String sendRequest(
			String method,
			String urlString,
			ConnectionConfigurer configurer,
			String operation
	) throws IOException {
		String current = urlString;
		for (int attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
			URL url = new URL(current);
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setInstanceFollowRedirects(false);
			conn.setRequestMethod(method);
			conn.setRequestProperty("Authorization", "Bearer " + apiKey);
			configurer.configure(conn);

			int code = conn.getResponseCode();
			if (isRedirect(code)) {
				String location = conn.getHeaderField("Location");
				if (location == null || location.isBlank()) {
					throw new IOException(operation + " failed HTTP " + code + ": missing Location header");
				}
				current = resolveRedirect(url, location);
				continue;
			}

			InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
			String resp = readStream(stream);
			if (code >= 400) {
				throw new IOException(operation + " failed HTTP " + code + ": " + summarizeBody(resp));
			}
			return resp;
		}
		throw new IOException(operation + " failed: too many redirects");
	}

	private static boolean isRedirect(int code) {
		return code == 301 || code == 302 || code == 303 || code == 307 || code == 308;
	}

	private static String resolveRedirect(URL base, String location) throws MalformedURLException {
		if (location.regionMatches(true, 0, "http://", 0, 7)
				|| location.regionMatches(true, 0, "https://", 0, 8)) {
			return location.trim();
		}
		return new URL(base, location.trim()).toString();
	}

	private static String summarizeBody(String body) {
		if (body == null || body.isBlank()) return "(empty body)";
		String trimmed = body.trim();
		if (trimmed.startsWith("<")) {
			return "HTML response (check Site URL uses https:// for production hosts)";
		}
		if (trimmed.length() > 500) {
			return trimmed.substring(0, 497) + "...";
		}
		return trimmed;
	}

	private static String readStream(InputStream stream) throws IOException {
		if (stream == null) return "";
		try (Scanner s = new Scanner(stream, StandardCharsets.UTF_8)) {
			s.useDelimiter("\\A");
			return s.hasNext() ? s.next() : "";
		}
	}

	private static AllocateResponse parseAllocate(String json) {
		AllocateResponse r = new AllocateResponse();
		Matcher m = SESSION_ID.matcher(json);
		if (m.find()) r.sessionId = m.group(1);
		r.isNew = json.contains("\"isNew\":true") || json.contains("\"isNew\": true");
		Matcher rev = Pattern.compile("\"revision\"\\s*:\\s*(\\d+)").matcher(json);
		if (rev.find()) r.revision = Integer.parseInt(rev.group(1));
		if (r.sessionId == null) {
			throw new IllegalStateException(
					"Invalid allocate response (use https:// for production Site URL): " + summarizeBody(json));
		}
		return r;
	}

	public static final class AllocateResponse {
		public String sessionId;
		public boolean isNew;
		public int revision;
	}
}
