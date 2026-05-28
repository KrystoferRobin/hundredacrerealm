package com.hundredacre.realm.export;

import java.awt.BorderLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.File;
import java.util.Map;

import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import javax.swing.filechooser.FileNameExtensionFilter;

import com.robin.magic_realm.components.utility.GameFileFilters;

/**
 * Swing UI styled after RealmSpeak file choosers.
 */
public class RealmExportFrame extends JFrame {
	private final RealmSpeakPaths paths;
	private final JTextField saveField = new JTextField(42);
	private final JTextField realmspeakField = new JTextField(42);
	private final JTextField outputField = new JTextField(42);
	private final JTextArea logArea = new JTextArea(14, 60);

	public RealmExportFrame(RealmSpeakPaths paths) {
		super("Hundred Acre Realm — Session Export");
		this.paths = paths;
		realmspeakField.setText(paths.getHome().getPath());
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
		addRow(form, c, "Save game (.rsgame):", saveField, this::browseSave);
		addRow(form, c, "Output folder:", outputField, this::browseOutput);

		JButton exportBtn = new JButton("Export upload bundle");
		exportBtn.addActionListener(e -> runExport());
		c.gridy++;
		c.gridwidth = 2;
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
		JButton browseBtn = new JButton("Browse…");
		browseBtn.addActionListener(e -> browse.run());
		c.gridx = 2;
		c.weightx = 0;
		form.add(browseBtn, c);
		c.weightx = 1;
		c.gridy++;
	}

	private void browseSave() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileFilter(GameFileFilters.createSaveGameFileFilter());
		chooser.setDialogTitle("Select completed RealmSpeak save");
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			File f = chooser.getSelectedFile();
			saveField.setText(f.getAbsolutePath());
			if (outputField.getText().isBlank()) {
				outputField.setText(new File(f.getParentFile(), "export-" + f.getName().replace(".rsgame", "")).getPath());
			}
		}
	}

	private void browseRealmspeak() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
		chooser.setDialogTitle("RealmSpeak install folder");
		if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
			realmspeakField.setText(chooser.getSelectedFile().getAbsolutePath());
		}
	}

	private void browseOutput() {
		JFileChooser chooser = new JFileChooser();
		chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
		chooser.setDialogTitle("Export output folder");
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
		File out = new File(outputField.getText().trim());

		if (!save.isFile()) {
			JOptionPane.showMessageDialog(this, "Select a valid .rsgame file.", "Missing save", JOptionPane.WARNING_MESSAGE);
			return;
		}
		if (!out.isDirectory() && !out.mkdirs() && !out.isDirectory()) {
			JOptionPane.showMessageDialog(this, "Could not create output folder.", "Output error", JOptionPane.ERROR_MESSAGE);
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

		logArea.setText("");
		log("Exporting " + save.getName() + " …");

		SwingWorker<Map<String, Object>, Void> worker = new SwingWorker<>() {
			@Override
			protected Map<String, Object> doInBackground() throws Exception {
				return new SessionExporter(activePaths).export(save, out);
			}

			@Override
			protected void done() {
				try {
					Map<String, Object> manifest = get();
					@SuppressWarnings("unchecked")
					Map<String, Object> summary = (Map<String, Object>) manifest.get("setupCard");
					if (summary != null) {
						@SuppressWarnings("unchecked")
						Map<String, Object> s = (Map<String, Object>) summary.get("summary");
						if (s != null) {
							log("Setup card holders: " + s.get("holderCount")
									+ " (treasure " + s.get("treasureHolderCount")
									+ ", native " + s.get("nativeHolderCount") + ")");
						}
					}
					log("Wrote bundle to: " + out.getAbsolutePath());
					log("Ready for upload / Node pipeline.");
				} catch (Exception ex) {
					log("ERROR: " + ex.getMessage());
					ex.printStackTrace();
					JOptionPane.showMessageDialog(RealmExportFrame.this,
							ex.getMessage(), "Export failed", JOptionPane.ERROR_MESSAGE);
				}
			}
		};
		worker.execute();
	}
}
