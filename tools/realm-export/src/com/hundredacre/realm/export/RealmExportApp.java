package com.hundredacre.realm.export;

import javax.swing.SwingUtilities;
import javax.swing.UIManager;

/**
 * Entry point — launch with {@code run.bat} or {@code run-hundred-acre.bat} (RealmSpeak classpath).
 */
public class RealmExportApp {
	public static void main(String[] args) {
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (Exception ignored) {
			// default L&F
		}

		SwingUtilities.invokeLater(() -> new RealmHubFrame(InstallSettings.load()).setVisible(true));
	}
}
