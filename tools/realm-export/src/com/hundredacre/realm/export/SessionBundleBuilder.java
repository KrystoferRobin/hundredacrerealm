package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Builds a {@code .realm-session.zip} bundle for site import.
 */
public final class SessionBundleBuilder {
	public static final int SCHEMA_VERSION = 1;
	public static final String MANIFEST_NAME = "manifest.json";

	private SessionBundleBuilder() {}

	public static File buildRealmSessionZip(
			File workDir,
			String sessionId,
			RealmIdentity identity,
			int revision,
			String profile
	) throws IOException {
		List<String> files = new ArrayList<>();
		for (File f : workDir.listFiles()) {
			if (!f.isFile() || f.getName().endsWith(".zip")) continue;
			if ("public".equalsIgnoreCase(profile)) {
				String n = f.getName();
				if (n.equals("extracted_game.xml") || n.equals("setup_card.json")
						|| n.endsWith(".rsgame") || n.endsWith(".rslog")) {
					continue;
				}
			}
			files.add(f.getName());
		}

		Map<String, Object> manifest = new LinkedHashMap<>();
		manifest.put("schemaVersion", SCHEMA_VERSION);
		manifest.put("sessionId", sessionId);
		manifest.put("revision", revision);
		manifest.put("profile", profile != null ? profile : "public");
		manifest.put("exportedAt", java.time.Instant.now().toString());
		manifest.put("exporter", "realm-export-1.1");
		manifest.putAll(GameIdentityExtractor.toManifestMap(identity));
		manifest.put("files", files);

		File manifestFile = new File(workDir, MANIFEST_NAME);
		try (FileOutputStream fos = new FileOutputStream(manifestFile)) {
			fos.write(JsonUtil.toJson(manifest).getBytes(java.nio.charset.StandardCharsets.UTF_8));
		}
		if (!files.contains(MANIFEST_NAME)) {
			files.add(MANIFEST_NAME);
		}

		File zipOut = new File(workDir.getParentFile(), sessionId + ".realm-session.zip");
		try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipOut))) {
			for (String name : files) {
				File src = new File(workDir, name);
				if (!src.isFile()) continue;
				ZipEntry entry = new ZipEntry(name);
				zos.putNextEntry(entry);
				try (FileInputStream in = new FileInputStream(src)) {
					byte[] buf = new byte[8192];
					int n;
					while ((n = in.read(buf)) > 0) {
						zos.write(buf, 0, n);
					}
				}
				zos.closeEntry();
			}
		}
		return zipOut;
	}
}
