package com.hundredacre.realm.export;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.jdom.Element;
import org.jdom.output.Format;
import org.jdom.output.XMLOutputter;

import com.robin.game.objects.GameData;
import com.robin.game.objects.GameObject;
import com.robin.game.objects.GamePool;
import com.robin.magic_realm.components.wrapper.HostPrefWrapper;

/**
 * Loads a RealmSpeak save + master GameData and writes an upload bundle.
 * Setup-card extraction follows {@code TreasureSetupCardView} query/sort rules.
 */
public class SessionExporter {
	private final RealmSpeakPaths paths;

	public SessionExporter(RealmSpeakPaths paths) {
		this.paths = paths;
	}

	public RealmIdentity peekIdentity(File rsgameFile) throws IOException {
		GameData save = new GameData();
		if (!save.zipFromFile(rsgameFile)) {
			throw new IOException("Failed to load save: " + rsgameFile);
		}
		HostPrefWrapper.HOST_PREF_ID = null;
		return GameIdentityExtractor.extract(save);
	}

	/**
	 * @param profile {@code public} omits setup card only; {@code admin} includes all artifacts
	 */
	public Map<String, Object> export(File rsgameFile, File outputDir, String profile)
			throws IOException, InterruptedException {
		paths.validate();
		if (!rsgameFile.isFile()) {
			throw new IOException("Save file not found: " + rsgameFile);
		}
		Files.createDirectories(outputDir.toPath());

		HostPrefWrapper.HOST_PREF_ID = null;

		GameData master = new GameData();
		if (!master.loadFromPath(paths.getGameDataXml().getPath())) {
			throw new IOException("Failed to load master GameData: " + paths.getGameDataXml());
		}

		GameData save = new GameData();
		if (!save.zipFromFile(rsgameFile)) {
			throw new IOException("Failed to load save (not a valid .rsgame?): " + rsgameFile);
		}

		String baseName = stripExtension(rsgameFile.getName());
		File copiedSave = new File(outputDir, baseName + ".rsgame");
		Files.copy(rsgameFile.toPath(), copiedSave.toPath(), StandardCopyOption.REPLACE_EXISTING);

		File rslog = paths.getRslogForSave(rsgameFile);
		if (rslog != null) {
			Files.copy(rslog.toPath(), new File(outputDir, baseName + ".rslog").toPath(),
					StandardCopyOption.REPLACE_EXISTING);
		}

		File xmlOut = new File(outputDir, "extracted_game.xml");
		writeGameXml(save, xmlOut);

		NodePipelineRunner.runFullSessionPipeline(outputDir);

		boolean adminProfile = "admin".equalsIgnoreCase(profile);
		Map<String, Object> setupCard = null;
		if (adminProfile) {
			setupCard = buildSetupCardExport(save);
			writeJson(new File(outputDir, "setup_card.json"), setupCard);
		}

		Map<String, Object> manifest = new LinkedHashMap<>();
		manifest.put("exporter", "realm-export-1.0");
		manifest.put("saveFile", copiedSave.getName());
		manifest.put("rslogFile", rslog != null ? baseName + ".rslog" : null);
		manifest.put("gameName", save.getGameName());
		manifest.put("gameDescription", save.getGameDescription());
		manifest.put("objectCount", save.getGameObjects().size());
		manifest.put("masterGameDataPath", paths.getGameDataXml().getPath());
		manifest.put("realmspeakHome", paths.getHome().getPath());
		if (setupCard != null) manifest.put("setupCard", setupCard);
		List<String> files = new ArrayList<>();
		if (adminProfile) {
			files.add(copiedSave.getName());
			if (rslog != null) files.add(baseName + ".rslog");
			files.add("extracted_game.xml");
			if (setupCard != null) files.add("setup_card.json");
		}
		for (File f : outputDir.listFiles()) {
			if (f.isFile() && f.getName().endsWith(".json") && !files.contains(f.getName())) {
				files.add(f.getName());
			}
		}
		manifest.put("files", files);
		manifest.put("profile", profile);

		writeJson(new File(outputDir, "full_export.json"), manifest);
		return manifest;
	}

	public Map<String, Object> export(File rsgameFile, File outputDir) throws IOException, InterruptedException {
		return export(rsgameFile, outputDir, "admin");
	}

	private static String stripExtension(String name) {
		int dot = name.lastIndexOf('.');
		return dot > 0 ? name.substring(0, dot) : name;
	}

	private static void writeGameXml(GameData save, File xmlOut) throws IOException {
		Element root = save.getXML();
		XMLOutputter out = new XMLOutputter(Format.getPrettyFormat());
		try (FileWriter writer = new FileWriter(xmlOut)) {
			out.output(root, writer);
		}
	}

	private static void writeJson(File file, Object data) throws IOException {
		String json = JsonUtil.toJson(data);
		try (FileWriter writer = new FileWriter(file)) {
			writer.write(json);
		}
	}

	/**
	 * Mirrors TreasureSetupCardView holder discovery (ts_section + game keys).
	 */
	private Map<String, Object> buildSetupCardExport(GameData save) {
		HostPrefWrapper hostPrefs = HostPrefWrapper.findHostPrefs(save);
		String gameKeyVals = hostPrefs != null ? hostPrefs.getGameKeyVals() : "original_game";

		GamePool pool = new GamePool(save.getGameObjects());
		ArrayList<String> query = new ArrayList<>();
		query.add("ts_section");
		query.add(gameKeyVals);

		ArrayList<GameObject> holders = pool.find(query);
		sortSetupHolders(holders);

		List<Map<String, Object>> treasureRows = new ArrayList<>();
		List<Map<String, Object>> nativeRows = new ArrayList<>();

		for (GameObject holder : holders) {
			Map<String, Object> row = GameObjectWriter.toMap(holder, 6);
			row.put("cardType", holder.hasThisAttribute("native_die") ? "native_chart" : "treasure_setup");
			if (holder.hasThisAttribute("native_die")) {
				nativeRows.add(row);
			} else {
				treasureRows.add(row);
			}
		}

		Map<String, Object> bySection = new LinkedHashMap<>();
		for (GameObject holder : holders) {
			String section = holder.getThisAttribute("ts_section");
			if (section == null) section = "_unsectioned";
			@SuppressWarnings("unchecked")
			List<Map<String, Object>> list = (List<Map<String, Object>>) bySection.computeIfAbsent(
					section, k -> new ArrayList<>());
			list.add(GameObjectWriter.toMap(holder, 4));
		}

		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("holderCount", holders.size());
		summary.put("treasureHolderCount", treasureRows.size());
		summary.put("nativeHolderCount", nativeRows.size());
		summary.put("gameKeyVals", gameKeyVals);

		Map<String, Object> root = new LinkedHashMap<>();
		root.put("summary", summary);
		root.put("bySection", bySection);
		root.put("treasureSetupHolders", treasureRows);
		root.put("nativeChartHolders", nativeRows);
		return root;
	}

	private static void sortSetupHolders(ArrayList<GameObject> list) {
		Collections.sort(list, new Comparator<GameObject>() {
			public int compare(GameObject go1, GameObject go2) {
				String s1 = go1.getThisAttribute("ts_section");
				String s2 = go2.getThisAttribute("ts_section");
				if (s1 == null) s1 = "";
				if (s2 == null) s2 = "";
				int ret = s1.compareTo(s2);
				if (ret != 0) return ret;

				int md1 = go1.getThisInt("monster_die");
				int md2 = go2.getThisInt("monster_die");
				ret = md1 - md2;
				if (ret != 0) return ret;

				int md12 = go1.getThisInt("monster_die2");
				int md22 = go2.getThisInt("monster_die2");
				ret = md12 - md22;
				if (ret != 0) return ret;

				String sm1 = go1.getThisAttribute("summon");
				if (sm1 == null) sm1 = go1.getName();
				String sm2 = go2.getThisAttribute("summon");
				if (sm2 == null) sm2 = go2.getName();
				ret = sm2.compareTo(sm1);
				if (ret != 0) return ret;

				return go1.getThisInt("box_num") - go2.getThisInt("box_num");
			}
		});
	}
}
