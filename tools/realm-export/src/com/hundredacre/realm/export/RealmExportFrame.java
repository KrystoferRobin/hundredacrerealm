package com.hundredacre.realm.export;

import java.awt.BorderLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.File;

import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;

import com.robin.magic_realm.components.utility.GameFileFilters;

/**
 * Export completed saves: allocate session ID via API, build bundle, upload.
 */
public class RealmExportFrame extends JFrame {
	private final RealmSpeakPaths paths;
	private final JTextField saveField = new JTextField(42);
	private final JTextField realmspeakField = new JTextField(42);
	private final JTextField siteUrlField = new JTextField(42);
	private final JTextField apiKeyField = new JTextField(42);
	private final JTextField outputField = new JTextField(42);
	private final JCheckBox uploadCheck = new JCheckBox("Upload to site after export", true);
	private final JCheckBox publicProfileCheck = new JCheckBox("Public profile (omit setup card only)", true);
	private final JTextArea logArea = new JTextArea(16, 60);

	public RealmExportFrame(RealmSpeakPaths paths) {
		super("Hundred Acre Realm — Session Export");
		this.paths = paths;
		realmspeakField.setText(paths.getHome().getPath());
		siteUrlField.setText(ExportSettings.getSiteUrl());
		apiKeyField.setText(ExportSettings.getApiKey());
		outputField.setText(new File(System.getProperty("user.home"), "realm-export-out").getPath());
		logArea.setEditable(false);
		buildUi();
		setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		pack();
		setLocationRelativeTo(null);
	}

	private void buildUi() {
		JPanel form = new JPanel(new GridBagLayout());
		GridBagConstraints c = new GridBagConstraints();
		c.insets = new Insets(4, 4, 4, 4);
		c.fill = GridBagConstraints.HORIZONTAL;
		c.weightx = 1;
		c.gridy = 0;

		addRow(form, c, "RealmSpeak folder:", realmspeakField, this::browseRealmspeak);
		addRow(form, c, "Site URL:", siteUrlField, null);
		addRow(form, c, "API key:", apiKeyField, null);
		addRow(form, c, "Save game (.rsgame):", saveField, this::browseSave);
		addRow(form, c, "Local output folder:", outputField, this::browseOutput);

		c.gridx = 1;
		c.gridwidth = 2;
		form.add(uploadCheck, c);
		c.gridy++;
		form.add(publicProfileCheck, c);
		c.gridy++;

		JButton exportBtn = new JButton("Allocate ID → Export → Upload");
		exportBtn.addActionListener(e -> runExport());
		c.gridy++;
		form.add(exportBtn, c);

		JPanel root = new JPanel(new BorderLayout(8, 8));
		root.add(form, BorderLayout.NORTH);
		root.add(new JScrollPane(logArea), BorderLayout.CENTER);
		setContentPane(root);
	}

	private void addRow(JPanel form, GridBagConstraints c, String label, JTextField field, Runnable browse) {
		c.gridwidth = 1;
		c.gridx = 0;
		form.add(new JLabel(label), c);
		c.gridx = 1;
		form.add(field, c);
		if (browse != null) {
			JButton browseBtn = new JButton("Browse…");
			browseBtn.addActionListener(e -> browse.run());
			c.gridx = 2;
			c.weightx = 0;
			form.add(browseBtn, c);
			c.weightx = 1;
		}
		c.gridy++;
	}

	private void browseSave() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileFilter(GameFileFilters.createSaveGameFileFilter());
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			saveField.setText(chooser.getSelectedFile().getAbsolutePath());
		}
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

	private void log(String line) {
		logArea.append(line + "\n");
		logArea.setCaretPosition(logArea.getDocument().getLength());
	}

	private void runExport() {
		File save = new File(saveField.getText().trim());
		File rsHome = new File(realmspeakField.getText().trim());
		File outRoot = new File(outputField.getText().trim());
		String siteUrl = siteUrlField.getText().trim();
		String apiKey = apiKeyField.getText().trim();

		if (!save.isFile()) {
			JOptionPane.showMessageDialog(this, "Select a valid .rsgame file.", "Missing save",
					JOptionPane.WARNING_MESSAGE);
			return;
		}

		RealmSpeakPaths activePaths;
		try {
			activePaths = new RealmSpeakPaths(rsHome);
			activePaths.validate();
		} catch (IllegalStateException ex) {
			JOptionPane.showMessageDialog(this, ex.getMessage(), "RealmSpeak path", JOptionPane.ERROR_MESSAGE);
			return;
		}

		if (uploadCheck.isSelected() && (siteUrl.isEmpty() || apiKey.isEmpty())) {
			JOptionPane.showMessageDialog(this, "Site URL and API key are required for upload.",
					"API settings", JOptionPane.WARNING_MESSAGE);
			return;
		}

		ExportSettings.save(siteUrl, apiKey);
		logArea.setText("");

		SwingWorker<Void, String> worker = new SwingWorker<>() {
			@Override
			protected Void doInBackground() throws Exception {
				SessionExporter exporter = new SessionExporter(activePaths);
				RealmIdentity identity = exporter.peekIdentity(save);
				publish("Realm key (" + identity.realmKeySource + "): " + identity.realmKey.substring(0, 12) + "…");
				if (identity.gamePort != null) publish("  game port (gp__): " + identity.gamePort);
				if (identity.gameTitle != null) publish("  title: " + identity.gameTitle);

				String sessionId;
				int revision = 0;
				boolean isNew = true;

				if (uploadCheck.isSelected()) {
					RealmApiClient client = new RealmApiClient(siteUrl, apiKey);
					RealmApiClient.AllocateResponse alloc = client.allocate(identity);
					sessionId = alloc.sessionId;
					revision = alloc.revision;
					isNew = alloc.isNew;
					publish("Session ID: " + sessionId + (isNew ? " (new)" : " (existing table)"));
				} else {
					sessionId = java.util.UUID.randomUUID().toString();
					publish("Local-only session ID: " + sessionId);
				}

				File workDir = new File(outRoot, sessionId);
				workDir.mkdirs();
				String profile = publicProfileCheck.isSelected() ? "public" : "admin";
				publish("Exporting (" + profile + " profile)…");
				exporter.export(save, workDir, profile);

				File zip = SessionBundleBuilder.buildRealmSessionZip(workDir, sessionId, identity, revision, profile);
				publish("Bundle: " + zip.getName() + " (" + zip.length() / 1024 + " KB)");

				if (uploadCheck.isSelected()) {
					publish("Uploading…");
					RealmApiClient client = new RealmApiClient(siteUrl, apiKey);
					client.uploadBundle(sessionId, zip);
					publish("Upload complete. View: " + siteUrl + "/session/" + sessionId);
				} else {
					publish("Done. Output: " + workDir.getAbsolutePath());
				}
				return null;
			}

			@Override
			protected void process(java.util.List<String> chunks) {
				for (String line : chunks) log(line);
			}

			@Override
			protected void done() {
				try {
					get();
				} catch (Exception ex) {
					log("ERROR: " + ex.getMessage());
					ex.printStackTrace();
					JOptionPane.showMessageDialog(RealmExportFrame.this, ex.getMessage(), "Export failed",
							JOptionPane.ERROR_MESSAGE);
				}
			}
		};
		worker.execute();
	}
}
