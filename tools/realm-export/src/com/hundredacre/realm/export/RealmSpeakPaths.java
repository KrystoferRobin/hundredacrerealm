package com.hundredacre.realm.export;

import java.io.File;

/**
 * Locates RealmSpeak install files (jars + master GameData).
 */
public final class RealmSpeakPaths {
	private final File home;
	private final File gameDataXml;

	public RealmSpeakPaths(File home) {
		if (home == null || !home.isDirectory()) {
			throw new IllegalArgumentException("Invalid RealmSpeak home directory");
		}
		this.home = home.getAbsoluteFile();
		this.gameDataXml = new File(this.home, "gameData/MagicRealmData.xml");
	}

	public static RealmSpeakPaths resolve() {
		InstallSettings settings = InstallSettings.load().normalize();
		return settings.toPaths();
	}

	public File getHome() {
		return home;
	}

	public File getGameDataXml() {
		return gameDataXml;
	}

	public File getRslogForSave(File rsgameFile) {
		String base = rsgameFile.getName();
		if (base.toLowerCase().endsWith(".rsgame")) {
			base = base.substring(0, base.length() - 7);
		}
		File sibling = new File(rsgameFile.getParentFile(), base + ".rslog");
		return sibling.isFile() ? sibling : null;
	}

	public void validate() throws IllegalStateException {
		File jar = new File(home, "RealmSpeakFull.jar");
		if (!jar.isFile()) {
			throw new IllegalStateException("RealmSpeakFull.jar not found in " + home);
		}
		if (!gameDataXml.isFile()) {
			throw new IllegalStateException("MagicRealmData.xml not found at " + gameDataXml);
		}
	}

	@Override
	public String toString() {
		return home.getPath();
	}
}
