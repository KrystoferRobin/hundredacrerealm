package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.Properties;

/**
 * Persists site URL and API key in the user home directory.
 */
public final class ExportSettings {
	private static final File SETTINGS_FILE = new File(
			System.getProperty("user.home"),
			".hundredacre-realm-export.properties"
	);

	private ExportSettings() {}

	public static Properties load() {
		Properties props = new Properties();
		if (SETTINGS_FILE.isFile()) {
			try (FileInputStream in = new FileInputStream(SETTINGS_FILE)) {
				props.load(in);
			} catch (Exception ignored) {
			}
		}
		return props;
	}

	public static void save(String siteUrl, String apiKey) {
		Properties props = load();
		if (siteUrl != null) props.setProperty("siteUrl", siteUrl.trim());
		if (apiKey != null && !apiKey.isBlank()) props.setProperty("apiKey", apiKey.trim());
		try (FileOutputStream out = new FileOutputStream(SETTINGS_FILE)) {
			props.store(out, "Hundred Acre Realm export tool");
		} catch (Exception e) {
			throw new RuntimeException("Failed to save settings: " + e.getMessage(), e);
		}
	}

	public static String getSiteUrl() {
		return load().getProperty("siteUrl", "http://localhost:3000");
	}

	public static String getApiKey() {
		return load().getProperty("apiKey", "");
	}
}
