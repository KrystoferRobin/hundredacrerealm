package com.hundredacre.realm.export;

import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;

/**
 * Entry point — launch with {@code run.bat} (RealmSpeak classpath).
 */
public class RealmExportApp {
	public static void main(String[] args) {
		try {
			UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
		} catch (Exception ignored) {
			// default L&F
		}

		SwingUtilities.invokeLater(() -> {
			try {
				RealmSpeakPaths paths = RealmSpeakPaths.resolve();
				paths.validate();
				new RealmExportFrame(paths).setVisible(true);
			} catch (IllegalStateException ex) {
				JOptionPane.showMessageDialog(null,
						ex.getMessage() + "\n\nSet REALMSPEAK_HOME or install RealmSpeak at ../../../RealmSpeak",
						"RealmSpeak not found",
						JOptionPane.ERROR_MESSAGE);
				System.exit(1);
			}
		});
	}
}
