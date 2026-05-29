package com.hundredacre.realm.export;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Persists hub configuration as JSON in the RealmSpeak install directory
 * ({@code hundred-acre-realm.json}). Migrates legacy user-home properties once.
 */
public final class InstallSettings {
	public static final String FILE_NAME = "hundred-acre-realm.json";
	public static final String DEFAULT_SITE_URL = "https://realm.hundredacre.club";

	private String realmspeakHome = "";
	private String siteUrl = DEFAULT_SITE_URL;
	private String apiKey = "";
	private String outputFolder = "";
	private String lastSaveDirectory = "";

	public static InstallSettings load() {
		InstallSettings settings = new InstallSettings();
		File jsonFile = resolveSettingsFile(null);
		if (jsonFile != null && jsonFile.isFile()) {
			settings.apply(SimpleJson.parseFlatObject(readUtf8(jsonFile)));
			return settings.normalize();
		}
		settings.apply(migrateLegacyProperties());
		return settings.normalize();
	}

	public static File resolveSettingsFile(String realmspeakHomeHint) {
		if (realmspeakHomeHint != null && !realmspeakHomeHint.isBlank()) {
			File inInstall = new File(realmspeakHomeHint.trim(), FILE_NAME);
			if (inInstall.getParentFile().isDirectory() || inInstall.getParentFile().mkdirs()) {
				return inInstall;
			}
		}
		String env = System.getenv("REALMSPEAK_HOME");
		if (env != null && !env.isBlank()) {
			return new File(env.trim(), FILE_NAME);
		}
		File cwd = new File(System.getProperty("user.dir"), FILE_NAME);
		if (cwd.isFile()) {
			return cwd;
		}
		File relative = new File("../../../RealmSpeak", FILE_NAME).getAbsoluteFile();
		if (relative.isFile()) {
			return relative;
		}
		if (realmspeakHomeHint != null && !realmspeakHomeHint.isBlank()) {
			return new File(realmspeakHomeHint.trim(), FILE_NAME);
		}
		return cwd;
	}

	public void save() {
		String home = realmspeakHome == null ? "" : realmspeakHome.trim();
		if (home.isEmpty()) {
			throw new IllegalStateException("Set the RealmSpeak folder before saving settings.");
		}
		File target = resolveSettingsFile(home);
		Map<String, String> data = new LinkedHashMap<>();
		data.put("realmspeakHome", home);
		data.put("siteUrl", siteUrl == null ? "" : siteUrl.trim());
		data.put("apiKey", apiKey == null ? "" : apiKey.trim());
		data.put("outputFolder", outputFolder == null ? "" : outputFolder.trim());
		data.put("lastSaveDirectory", lastSaveDirectory == null ? "" : lastSaveDirectory.trim());
		try {
			File parent = target.getParentFile();
			if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
				throw new IOException("Cannot create directory: " + parent);
			}
			Files.writeString(target.toPath(), SimpleJson.toFlatObject(data), StandardCharsets.UTF_8);
		} catch (IOException e) {
			throw new RuntimeException("Failed to save settings: " + e.getMessage(), e);
		}
	}

	public InstallSettings normalize() {
		if (realmspeakHome == null || realmspeakHome.isBlank()) {
			realmspeakHome = guessRealmspeakHome();
		}
		if (outputFolder == null || outputFolder.isBlank()) {
			outputFolder = new File(System.getProperty("user.home"), "realm-export-out").getPath();
		}
		siteUrl = normalizeSiteUrl(siteUrl);
		if (apiKey == null) {
			apiKey = "";
		}
		if (lastSaveDirectory == null) {
			lastSaveDirectory = "";
		}
		return this;
	}

	/**
	 * Ensures a scheme is present. Local/dev hosts use http; public hostnames use https
	 * so nginx TLS redirects do not break API POSTs (HttpURLConnection does not follow
	 * POST redirects reliably).
	 */
	public static String normalizeSiteUrl(String url) {
		if (url == null || url.isBlank()) {
			return DEFAULT_SITE_URL;
		}
		String trimmed = url.trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}

		String withScheme;
		if (hasScheme(trimmed)) {
			withScheme = trimmed;
		} else if (isLocalHostName(trimmed)) {
			withScheme = "http://" + trimmed;
		} else {
			withScheme = "https://" + trimmed;
		}

		try {
			java.net.URL parsed = new java.net.URL(withScheme);
			String host = parsed.getHost();
			if ("http".equalsIgnoreCase(parsed.getProtocol()) && !isLocalHostName(host)) {
				int port = parsed.getPort();
				int httpsPort = (port == 80 || port == -1) ? -1 : port;
				String path = parsed.getFile() == null ? "" : parsed.getFile();
				parsed = new java.net.URL("https", host, httpsPort, path);
				withScheme = parsed.toString();
			}
			while (withScheme.endsWith("/")) {
				withScheme = withScheme.substring(0, withScheme.length() - 1);
			}
			return withScheme;
		} catch (java.net.MalformedURLException e) {
			return withScheme;
		}
	}

	private static boolean hasScheme(String url) {
		return url.regionMatches(true, 0, "http://", 0, 7)
				|| url.regionMatches(true, 0, "https://", 0, 8);
	}

	static boolean isLocalHostName(String hostOrUrl) {
		if (hostOrUrl == null || hostOrUrl.isBlank()) {
			return false;
		}
		String host = hostOrUrl.trim().toLowerCase();
		if (host.startsWith("http://")) {
			host = host.substring(7);
		} else if (host.startsWith("https://")) {
			host = host.substring(8);
		}
		int slash = host.indexOf('/');
		if (slash >= 0) {
			host = host.substring(0, slash);
		}
		int colon = host.indexOf(':');
		if (colon >= 0) {
			host = host.substring(0, colon);
		}
		if (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("::1")) {
			return true;
		}
		if (host.endsWith(".local")) {
			return true;
		}
		return host.startsWith("192.168.")
				|| host.startsWith("10.")
				|| host.matches("172\\.(1[6-9]|2\\d|3[01])\\..*");
	}

	public RealmSpeakPaths toPaths() {
		return new RealmSpeakPaths(new File(realmspeakHome));
	}

	private static String guessRealmspeakHome() {
		String env = System.getenv("REALMSPEAK_HOME");
		if (env != null && !env.isBlank()) {
			return env.trim();
		}
		File cwd = new File(System.getProperty("user.dir"));
		if (new File(cwd, "RealmSpeakFull.jar").isFile()) {
			return cwd.getAbsolutePath();
		}
		File devBuild = new File(
				"../../RealmSpeak-src/build/RealmSpeak1258").getAbsoluteFile();
		if (new File(devBuild, "RealmSpeakFull.jar").isFile()) {
			return devBuild.getPath();
		}
		File relative = new File("../../../RealmSpeak").getAbsoluteFile();
		if (new File(relative, "RealmSpeakFull.jar").isFile()) {
			return relative.getPath();
		}
		return cwd.getAbsolutePath();
	}

	private static Map<String, String> migrateLegacyProperties() {
		Map<String, String> data = new LinkedHashMap<>();
		Properties legacy = ExportSettings.loadLegacyProperties();
		String site = legacy.getProperty("siteUrl", "");
		String key = legacy.getProperty("apiKey", "");
		if (!site.isBlank()) {
			data.put("siteUrl", site);
		}
		if (!key.isBlank()) {
			data.put("apiKey", key);
		}
		return data;
	}

	private void apply(Map<String, String> data) {
		if (data == null) {
			return;
		}
		if (data.containsKey("realmspeakHome")) {
			realmspeakHome = data.get("realmspeakHome");
		}
		if (data.containsKey("siteUrl")) {
			siteUrl = data.get("siteUrl");
		}
		if (data.containsKey("apiKey")) {
			apiKey = data.get("apiKey");
		}
		if (data.containsKey("outputFolder")) {
			outputFolder = data.get("outputFolder");
		}
		if (data.containsKey("lastSaveDirectory")) {
			lastSaveDirectory = data.get("lastSaveDirectory");
		}
	}

	private static String readUtf8(File file) {
		try {
			return Files.readString(file.toPath(), StandardCharsets.UTF_8);
		} catch (IOException e) {
			throw new RuntimeException("Failed to read " + file + ": " + e.getMessage(), e);
		}
	}

	public String getRealmspeakHome() {
		return realmspeakHome;
	}

	public void setRealmspeakHome(String realmspeakHome) {
		this.realmspeakHome = realmspeakHome;
	}

	public String getSiteUrl() {
		return siteUrl;
	}

	public void setSiteUrl(String siteUrl) {
		this.siteUrl = siteUrl;
	}

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public String getOutputFolder() {
		return outputFolder;
	}

	public void setOutputFolder(String outputFolder) {
		this.outputFolder = outputFolder;
	}

	public String getLastSaveDirectory() {
		return lastSaveDirectory;
	}

	public void setLastSaveDirectory(String lastSaveDirectory) {
		this.lastSaveDirectory = lastSaveDirectory;
	}
}
