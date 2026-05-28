package com.hundredacre.realm.export;

import java.awt.BorderLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.File;

import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import javax.swing.border.EmptyBorder;

import com.robin.magic_realm.components.utility.GameFileFilters;

/**
 * Upload tab — save selector and export/upload workflow.
 */
public class UploadPanel extends JPanel {
	private final JTextField saveField = new JTextField(42);
	private final JTextField outputField = new JTextField(42);
	private final JCheckBox uploadCheck = new JCheckBox("Upload to site after export", true);
	private final JCheckBox publicProfileCheck = new JCheckBox("Public profile (omit setup card only)", true);
	private final JTextArea logArea = new JTextArea(16, 60);
	private InstallSettings settings = new InstallSettings().normalize();

	public UploadPanel() {
		setLayout(new BorderLayout(8, 8));
		setBorder(new EmptyBorder(12, 12, 12, 12));
		buildUi();
	}

	public void applySettings(InstallSettings settings) {
		this.settings = settings.normalize();
		outputField.setText(this.settings.getOutputFolder());
		String lastDir = this.settings.getLastSaveDirectory();
		if (lastDir != null && !lastDir.isBlank()) {
			saveField.setToolTipText("Last folder: " + lastDir);
		}
	}

	private void buildUi() {
		JPanel form = new JPanel(new GridBagLayout());
		GridBagConstraints c = new GridBagConstraints();
		c.insets = new Insets(4, 4, 4, 4);
		c.fill = GridBagConstraints.HORIZONTAL;
		c.weightx = 1;
		c.gridy = 0;

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

		logArea.setEditable(false);
		add(form, BorderLayout.NORTH);
		add(new JScrollPane(logArea), BorderLayout.CENTER);
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
		String lastDir = settings.getLastSaveDirectory();
		if (lastDir != null && !lastDir.isBlank()) {
			File dir = new File(lastDir);
			if (dir.isDirectory()) {
				chooser.setCurrentDirectory(dir);
			}
		}
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			File selected = chooser.getSelectedFile();
			saveField.setText(selected.getAbsolutePath());
			if (selected.getParentFile() != null) {
				settings.setLastSaveDirectory(selected.getParentFile().getAbsolutePath());
				String home = settings.getRealmspeakHome();
				if (home != null && !home.isBlank()) {
					settings.save();
				}
			}
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
		File outRoot = new File(outputField.getText().trim());
		String siteUrl = settings.getSiteUrl().trim();
		String apiKey = settings.getApiKey().trim();

		if (!save.isFile()) {
			JOptionPane.showMessageDialog(this, "Select a valid .rsgame file.", "Missing save",
					JOptionPane.WARNING_MESSAGE);
			return;
		}

		RealmSpeakPaths activePaths;
		try {
			activePaths = settings.toPaths();
			activePaths.validate();
		} catch (IllegalStateException ex) {
			JOptionPane.showMessageDialog(this,
					ex.getMessage() + "\n\nSet the RealmSpeak folder on the Settings tab.",
					"RealmSpeak path",
					JOptionPane.ERROR_MESSAGE);
			return;
		}

		if (uploadCheck.isSelected() && (siteUrl.isEmpty() || apiKey.isEmpty())) {
			JOptionPane.showMessageDialog(this,
					"Site URL and API key are required for upload.\nConfigure them on the Settings tab.",
					"API settings",
					JOptionPane.WARNING_MESSAGE);
			return;
		}

		settings.setOutputFolder(outRoot.getPath());
		settings.save();
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
					JOptionPane.showMessageDialog(UploadPanel.this, ex.getMessage(), "Export failed",
							JOptionPane.ERROR_MESSAGE);
				}
			}
		};
		worker.execute();
	}
}
