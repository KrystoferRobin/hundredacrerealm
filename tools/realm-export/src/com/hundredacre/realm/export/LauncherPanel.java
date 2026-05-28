package com.hundredacre.realm.export;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.io.File;

import javax.swing.Box;
import javax.swing.BoxLayout;

import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.border.EmptyBorder;

/**
 * Launcher tab — starts RealmSpeak and bundled utilities from the configured install folder.
 */
public class LauncherPanel extends JPanel {
	private final Runnable onSettingsNeeded;

	public LauncherPanel(Runnable onSettingsNeeded) {
		this.onSettingsNeeded = onSettingsNeeded;
		setLayout(new BorderLayout(12, 12));
		setBorder(new EmptyBorder(12, 12, 12, 12));
	}

	public void refresh(InstallSettings settings) {
		removeAll();
		JPanel header = new JPanel(new BorderLayout());
		header.add(new JLabel("Launch RealmSpeak tools from your install folder."), BorderLayout.CENTER);
		add(header, BorderLayout.NORTH);

		RealmSpeakPaths paths;
		try {
			paths = settings.toPaths();
			paths.validate();
		} catch (Exception ex) {
			JPanel missing = new JPanel(new BorderLayout(8, 8));
			missing.add(new JLabel(
					"<html>RealmSpeak was not found.<br/>Set the install folder on the Settings tab first.</html>"),
					BorderLayout.CENTER);
			JButton openSettings = new JButton("Open Settings");
			openSettings.addActionListener(e -> onSettingsNeeded.run());
			missing.add(openSettings, BorderLayout.SOUTH);
			add(missing, BorderLayout.CENTER);
			revalidate();
			repaint();
			return;
		}

		JPanel content = new JPanel();
		content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));

		JPanel mainRow = new JPanel(new FlowLayout(FlowLayout.CENTER, 0, 0));
		mainRow.setAlignmentX(Component.CENTER_ALIGNMENT);
		mainRow.add(createLaunchButton(paths, RealmSpeakApp.MAIN_GAME, 160, 220, 220));
		content.add(mainRow);
		content.add(Box.createVerticalStrut(20));

		JPanel toolsGrid = new JPanel(new GridBagLayout());
		toolsGrid.setAlignmentX(Component.CENTER_ALIGNMENT);
		GridBagConstraints c = new GridBagConstraints();
		c.insets = new Insets(4, 6, 4, 6);
		c.fill = GridBagConstraints.NONE;
		c.anchor = GridBagConstraints.CENTER;

		int col = 0;
		int row = 0;
		for (RealmSpeakApp app : RealmSpeakApp.values()) {
			if (app.primary) {
				continue;
			}
			c.gridx = col;
			c.gridy = row;
			toolsGrid.add(createLaunchButton(paths, app, 48, 100, 88), c);
			col++;
			if (col >= 4) {
				col = 0;
				row++;
			}
		}
		content.add(toolsGrid);

		JScrollPane scroll = new JScrollPane(content);
		scroll.setBorder(null);
		scroll.getVerticalScrollBar().setUnitIncrement(16);
		add(scroll, BorderLayout.CENTER);

		JLabel footer = new JLabel("Install: " + paths.getHome().getPath());
		add(footer, BorderLayout.SOUTH);
		revalidate();
		repaint();
	}

	private Component createLaunchButton(RealmSpeakPaths paths, RealmSpeakApp app, int maxIcon, int width, int height) {
		JButton button = new JButton(app.buttonLabel);
		button.setHorizontalTextPosition(JButton.CENTER);
		button.setVerticalTextPosition(JButton.BOTTOM);
		button.setPreferredSize(new Dimension(width, height));
		button.setMaximumSize(new Dimension(width, height));

		var icon = RealmImageLoader.loadIcon(app.imageResource, maxIcon);
		if (icon == null) {
			icon = RealmImageLoader.loadIconFromStream(
					app.imageResource.startsWith("/") ? app.imageResource.substring(1) : app.imageResource,
					maxIcon);
		}
		if (icon != null) {
			button.setIcon(icon);
		}

		button.addActionListener(e -> {
			try {
				RealmSpeakLauncher.launch(paths, app);
			} catch (Exception ex) {
				JOptionPane.showMessageDialog(this,
						"Could not start " + app.menuLabel + ":\n" + ex.getMessage(),
						"Launch failed",
						JOptionPane.ERROR_MESSAGE);
			}
		});
		return button;
	}
}
