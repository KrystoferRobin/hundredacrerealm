package com.hundredacre.realm.export;

import java.awt.Image;
import java.io.InputStream;
import java.net.URL;

import javax.swing.ImageIcon;

/**
 * Loads artwork packaged inside {@code RealmSpeakFull.jar}.
 */
public final class RealmImageLoader {
	private RealmImageLoader() {}

	public static ImageIcon loadIcon(String resourcePath, int maxSize) {
		String path = resourcePath.startsWith("/") ? resourcePath : "/" + resourcePath;
		URL url = RealmImageLoader.class.getResource(path);
		if (url == null) {
			return null;
		}
		ImageIcon icon = new ImageIcon(url);
		if (maxSize > 0 && (icon.getIconWidth() > maxSize || icon.getIconHeight() > maxSize)) {
			double scale = Math.min(
					(double) maxSize / icon.getIconWidth(),
					(double) maxSize / icon.getIconHeight());
			int w = Math.max(1, (int) (icon.getIconWidth() * scale));
			int h = Math.max(1, (int) (icon.getIconHeight() * scale));
			Image scaled = icon.getImage().getScaledInstance(w, h, Image.SCALE_SMOOTH);
			return new ImageIcon(scaled);
		}
		return icon;
	}

	public static ImageIcon loadIconFromStream(String resourcePath, int maxSize) {
		String path = resourcePath.startsWith("/") ? resourcePath.substring(1) : resourcePath;
		try (InputStream in = RealmImageLoader.class.getClassLoader().getResourceAsStream(path)) {
			if (in == null) {
				return null;
			}
			byte[] bytes = in.readAllBytes();
			ImageIcon icon = new ImageIcon(bytes);
			if (maxSize > 0 && (icon.getIconWidth() > maxSize || icon.getIconHeight() > maxSize)) {
				double scale = Math.min(
						(double) maxSize / icon.getIconWidth(),
						(double) maxSize / icon.getIconHeight());
				int w = Math.max(1, (int) (icon.getIconWidth() * scale));
				int h = Math.max(1, (int) (icon.getIconHeight() * scale));
				Image scaled = icon.getImage().getScaledInstance(w, h, Image.SCALE_SMOOTH);
				return new ImageIcon(scaled);
			}
			return icon;
		} catch (Exception e) {
			return null;
		}
	}
}
