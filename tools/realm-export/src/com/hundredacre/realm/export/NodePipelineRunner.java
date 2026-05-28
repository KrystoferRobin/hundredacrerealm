package com.hundredacre.realm.export;

import java.io.File;
import java.io.IOException;

/**
 * Runs the Node {@code extract_realmspeak_save.js} script to produce display JSON
 * (map_data, map_locations, game_state) after XML extraction.
 */
public final class NodePipelineRunner {
	private NodePipelineRunner() {}

	public static File resolveProjectRoot() {
		File cwd = new File(System.getProperty("user.dir"));
		File script = new File(cwd, "scripts/extract_realmspeak_save.js");
		if (script.isFile()) return cwd;
		File parent = new File(cwd, "../..");
		if (new File(parent, "scripts/extract_realmspeak_save.js").isFile()) {
			return parent.getAbsoluteFile();
		}
		String env = System.getenv("HUNDRED_ACRE_REALM_HOME");
		if (env != null) {
			File fromEnv = new File(env);
			if (new File(fromEnv, "scripts/extract_realmspeak_save.js").isFile()) {
				return fromEnv.getAbsoluteFile();
			}
		}
		return cwd;
	}

	public static void runDisplayExtraction(File workDir) throws IOException, InterruptedException {
		File projectRoot = resolveProjectRoot();
		File script = new File(projectRoot, "scripts/extract_realmspeak_save.js");
		if (!script.isFile()) {
			throw new IOException("Node script not found: " + script);
		}
		ProcessBuilder pb = new ProcessBuilder("node", script.getAbsolutePath());
		pb.directory(workDir);
		pb.redirectErrorStream(true);
		Process process = pb.start();
		int code = process.waitFor();
		if (code != 0) {
			throw new IOException("Node display extraction failed (exit " + code + ")");
		}
	}
}
