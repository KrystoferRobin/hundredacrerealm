package com.hundredacre.realm.export;

import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.File;

import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTextField;

/**
 * Settings tab — install path, site API credentials, and local export folder.
 */
public class SettingsPanel extends JPanel {
	public interface Listener {
		void onSettingsSaved(InstallSettings settings);
	}

	private final JTextField realmspeakField = new JTextField(42);
	private final JTextField siteUrlField = new JTextField(42);
	private final JTextField apiKeyField = new JTextField(42);
	private final JTextField outputField = new JTextField(42);
	private Listener listener;

	public SettingsPanel() {
		setLayout(new GridBagLayout());
		buildUi();
	}

	public void setListener(Listener listener) {
		this.listener = listener;
	}

	public void loadFrom(InstallSettings settings) {
		realmspeakField.setText(settings.getRealmspeakHome());
		siteUrlField.setText(settings.getSiteUrl());
		apiKeyField.setText(settings.getApiKey());
		outputField.setText(settings.getOutputFolder());
	}

	private InstallSettings readFields() {
		InstallSettings settings = new InstallSettings();
		settings.setRealmspeakHome(realmspeakField.getText().trim());
		settings.setSiteUrl(siteUrlField.getText().trim());
		settings.setApiKey(apiKeyField.getText().trim());
		settings.setOutputFolder(outputField.getText().trim());
		return settings.normalize();
	}

	private void buildUi() {
		GridBagConstraints c = new GridBagConstraints();
		c.insets = new Insets(4, 4, 4, 4);
		c.fill = GridBagConstraints.HORIZONTAL;
		c.weightx = 1;
		c.gridy = 0;

		addRow(c, "RealmSpeak folder:", realmspeakField, this::browseRealmspeak);
		addRow(c, "Site URL:", siteUrlField, null);
		addRow(c, "API key:", apiKeyField, null);
		addRow(c, "Default export folder:", outputField, this::browseOutput);

		c.gridx = 1;
		c.gridwidth = 2;
		JButton saveBtn = new JButton("Save settings");
		saveBtn.addActionListener(e -> saveSettings());
		add(saveBtn, c);
		c.gridy++;

		c.gridx = 1;
		c.gridwidth = 2;
		JLabel hint = new JLabel(
				"<html>Settings are stored as <code>hundred-acre-realm.json</code> in the RealmSpeak install folder.<br/>"
				+ "Site URL may be <code>http://localhost:3000</code> or <code>127.0.0.1:3000</code> — http:// is added if omitted.</html>");
		add(hint, c);
	}

	private void addRow(GridBagConstraints c, String label, JTextField field, Runnable browse) {
		c.gridwidth = 1;
		c.gridx = 0;
		add(new JLabel(label), c);
		c.gridx = 1;
		add(field, c);
		if (browse != null) {
			JButton browseBtn = new JButton("Browse…");
			browseBtn.addActionListener(e -> browse.run());
			c.gridx = 2;
			c.weightx = 0;
			add(browseBtn, c);
			c.weightx = 1;
		}
		c.gridy++;
	}

	private void browseRealmspeak() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			realmspeakField.setText(chooser.getSelectedFile().getAbsolutePath());
		}
	}

	private void browseOutput() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			outputField.setText(chooser.getSelectedFile().getAbsolutePath());
		}
	}

	private void saveSettings() {
		InstallSettings settings = readFields();
		try {
			new RealmSpeakPaths(new File(settings.getRealmspeakHome())).validate();
		} catch (Exception ex) {
			int choice = JOptionPane.showConfirmDialog(this,
					ex.getMessage() + "\n\nSave anyway?",
					"RealmSpeak folder",
					JOptionPane.YES_NO_OPTION,
					JOptionPane.WARNING_MESSAGE);
			if (choice != JOptionPane.YES_OPTION) {
				return;
			}
		}
		try {
			settings.save();
			JOptionPane.showMessageDialog(this,
					"Saved to " + InstallSettings.resolveSettingsFile(settings.getRealmspeakHome()).getPath(),
					"Settings saved",
					JOptionPane.INFORMATION_MESSAGE);
			if (listener != null) {
				listener.onSettingsSaved(settings);
			}
		} catch (Exception ex) {
			JOptionPane.showMessageDialog(this, ex.getMessage(), "Save failed", JOptionPane.ERROR_MESSAGE);
		}
	}
}
