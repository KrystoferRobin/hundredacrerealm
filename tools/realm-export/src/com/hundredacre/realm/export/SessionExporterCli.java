package com.hundredacre.realm.export;

import java.io.File;

/**
 * Headless export for scripts: {@code java ... SessionExporterCli save.rsgame outputDir}
 */
public class SessionExporterCli {
	public static void main(String[] args) throws Exception {
		if (args.length < 2) {
			System.err.println("Usage: SessionExporterCli <file.rsgame> <outputDir> [realmspeakHome]");
			System.exit(1);
		}
		File save = new File(args[0]);
		File out = new File(args[1]);
		RealmSpeakPaths paths = args.length >= 3
				? new RealmSpeakPaths(new File(args[2]))
				: RealmSpeakPaths.resolve();
		paths.validate();
		new SessionExporter(paths).export(save, out, "admin");
		System.out.println("Exported to " + out.getAbsolutePath());
	}
}
