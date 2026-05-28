package com.hundredacre.realm.export;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Starts RealmSpeak utilities as separate JVM processes (same as the shipped {@code launch*.bat} files).
 */
public final class RealmSpeakLauncher {
	private RealmSpeakLauncher() {}

	public static void launch(RealmSpeakPaths paths, RealmSpeakApp app) throws IOException {
		File home = paths.getHome();
		List<String> cmd = new ArrayList<>();
		cmd.add(javaCommand(home));
		cmd.add("-mx512m");
		cmd.add("-cp");
		cmd.add(buildClasspath(home, app.classpathMode));
		cmd.add(app.mainClass);

		ProcessBuilder pb = new ProcessBuilder(cmd);
		pb.directory(home);
		pb.start();
	}

	private static String buildClasspath(File home, RealmSpeakApp.ClasspathMode mode) {
		String sep = File.pathSeparator;
		File full = new File(home, "RealmSpeakFull.jar");
		if (mode == RealmSpeakApp.ClasspathMode.FULL_ONLY) {
			return full.getAbsolutePath();
		}
		File mail = new File(home, "mail.jar");
		File activation = new File(home, "activation.jar");
		return mail.getAbsolutePath() + sep + activation.getAbsolutePath() + sep + full.getAbsolutePath();
	}

	static String resolveJavaExecutable(File installHome) {
		if (installHome != null) {
			String os = System.getProperty("os.name", "").toLowerCase();
			String bundled = os.contains("win")
					? new File(installHome, "jre/bin/javaw.exe").getPath()
					: new File(installHome, "jre/bin/java").getPath();
			if (new File(bundled).canExecute()) {
				return bundled;
			}
		}
		String os = System.getProperty("os.name", "").toLowerCase();
		if (os.contains("win")) {
			return "javaw";
		}
		return ProcessHandle.current().info().command().orElse("java");
	}

	private static String javaCommand(File installHome) {
		return resolveJavaExecutable(installHome);
	}
}
