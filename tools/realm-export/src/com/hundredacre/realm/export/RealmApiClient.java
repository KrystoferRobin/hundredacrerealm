package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HTTP client for Hundred Acre Realm session allocate + bundle upload APIs.
 */
public class RealmApiClient {
	private static final Pattern SESSION_ID = Pattern.compile("\"sessionId\"\\s*:\\s*\"([^\"]+)\"");

	private final String baseUrl;
	private final String apiKey;

	public RealmApiClient(String baseUrl, String apiKey) {
		this.baseUrl = InstallSettings.normalizeSiteUrl(baseUrl);
		this.apiKey = apiKey;
	}

	public AllocateResponse allocate(RealmIdentity identity) throws IOException {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("realmKey", identity.realmKey);
		body.put("realmKeySource", identity.realmKeySource);
		if (identity.gameTitle != null) body.put("gameTitle", identity.gameTitle);
		Map<String, Object> id = GameIdentityExtractor.toManifestMap(identity);
		body.put("identity", id);

		String json = JsonUtil.toJson(body);
		String response = postJson("/api/realm/v1/sessions/allocate", json);
		return parseAllocate(response);
	}

	public void uploadBundle(String sessionId, File zipFile) throws IOException {
		URL url = new URL(baseUrl + "/api/realm/v1/sessions/" + sessionId + "/bundle");
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setRequestMethod("PUT");
		conn.setDoOutput(true);
		conn.setRequestProperty("Authorization", "Bearer " + apiKey);
		conn.setRequestProperty("Content-Type", "application/zip");

		try (OutputStream out = conn.getOutputStream();
				FileInputStream in = new FileInputStream(zipFile)) {
			byte[] buf = new byte[8192];
			int n;
			while ((n = in.read(buf)) > 0) {
				out.write(buf, 0, n);
			}
		}

		int code = conn.getResponseCode();
		InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
		String resp = readStream(stream);
		if (code >= 400) {
			throw new IOException("Upload failed HTTP " + code + ": " + resp);
		}
	}

	private String postJson(String path, String json) throws IOException {
		URL url = new URL(baseUrl + path);
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setRequestMethod("POST");
		conn.setDoOutput(true);
		conn.setRequestProperty("Authorization", "Bearer " + apiKey);
		conn.setRequestProperty("Content-Type", "application/json");
		conn.getOutputStream().write(json.getBytes(StandardCharsets.UTF_8));

		int code = conn.getResponseCode();
		InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
		String resp = readStream(stream);
		if (code >= 400) {
			throw new IOException("Allocate failed HTTP " + code + ": " + resp);
		}
		return resp;
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
			throw new IllegalStateException("Invalid allocate response: " + json);
		}
		return r;
	}

	public static final class AllocateResponse {
		public String sessionId;
		public boolean isNew;
		public int revision;
	}
}
