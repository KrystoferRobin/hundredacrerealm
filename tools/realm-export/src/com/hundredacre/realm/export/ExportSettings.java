package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileInputStream;
import java.util.Properties;

/**
 * Legacy settings helpers (CLI). GUI settings live in {@link InstallSettings}.
 */
public final class ExportSettings {
	private static final File LEGACY_FILE = new File(
			System.getProperty("user.home"),
			".hundredacre-realm-export.properties"
	);

	private ExportSettings() {}

	public static Properties loadLegacyProperties() {
		Properties props = new Properties();
		if (LEGACY_FILE.isFile()) {
			try (FileInputStream in = new FileInputStream(LEGACY_FILE)) {
				props.load(in);
			} catch (Exception ignored) {
			}
		}
		return props;
	}

	public static void save(String siteUrl, String apiKey) {
		InstallSettings settings = InstallSettings.load().normalize();
		if (siteUrl != null) {
			settings.setSiteUrl(siteUrl);
		}
		if (apiKey != null && !apiKey.isBlank()) {
			settings.setApiKey(apiKey);
		}
		settings.save();
	}

	public static String getSiteUrl() {
		return InstallSettings.load().normalize().getSiteUrl();
	}

	public static String getApiKey() {
		return InstallSettings.load().normalize().getApiKey();
	}
}
