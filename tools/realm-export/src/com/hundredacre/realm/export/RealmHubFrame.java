package com.hundredacre.realm.export;

import java.awt.BorderLayout;

import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JTabbedPane;
import javax.swing.border.EmptyBorder;

/**
 * Hundred Acre Realm hub — launcher, session upload, and configuration.
 */
public class RealmHubFrame extends JFrame {
	private final LauncherPanel launcherPanel;
	private final UploadPanel uploadPanel;
	private final SettingsPanel settingsPanel;
	private final JTabbedPane tabs;

	public RealmHubFrame(InstallSettings settings) {
		super("Hundred Acre Realm");
		InstallSettings initial = settings.normalize();
		tabs = new JTabbedPane();
		launcherPanel = new LauncherPanel(() -> tabs.setSelectedIndex(2));
		uploadPanel = new UploadPanel();
		settingsPanel = new SettingsPanel();

		buildUi();
		applySettings(initial);
		setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		pack();
		setLocationRelativeTo(null);
	}

	private void buildUi() {
		settingsPanel.setListener(this::applySettings);

		tabs.addTab("Launcher", launcherPanel);
		tabs.addTab("Upload", uploadPanel);
		tabs.addTab("Settings", settingsPanel);

		JPanel root = new JPanel(new BorderLayout());
		root.setBorder(new EmptyBorder(4, 4, 4, 4));
		root.add(tabs, BorderLayout.CENTER);
		setContentPane(root);
	}

	private void applySettings(InstallSettings updated) {
		InstallSettings normalized = updated.normalize();
		settingsPanel.loadFrom(normalized);
		uploadPanel.applySettings(normalized);
		launcherPanel.refresh(normalized);
	}
}
