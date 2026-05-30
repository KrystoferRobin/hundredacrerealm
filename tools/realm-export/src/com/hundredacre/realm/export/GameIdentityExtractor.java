package com.hundredacre.realm.export;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.robin.game.objects.GameData;
import com.robin.game.objects.GameObject;
import com.robin.magic_realm.components.wrapper.HostPrefWrapper;

/**
 * Derives a stable realmKey shared by all players at the same table.
 * Hosted games combine HostPref {@code gp__} with save {@code _rseed} so each game
 * instance is distinct (RealmSpeak Online reuses the same port across games).
 */
public final class GameIdentityExtractor {
	private GameIdentityExtractor() {}

	public static RealmIdentity extract(GameData save) {
		RealmIdentity identity = new RealmIdentity();
		org.jdom.Element root = save.getXML();
		if (root != null) {
			identity.rseed = root.getAttributeValue("_rseed");
			identity.gameName = root.getAttributeValue("name");
		}

		HostPrefWrapper hostPrefs = HostPrefWrapper.findHostPrefs(save);
		if (hostPrefs != null) {
			identity.gamePort = hostPrefs.getGameObject().getAttribute(HostPrefWrapper.HOST_PREF_BLOCK, "gp__");
			identity.gameTitle = hostPrefs.getGameTitle();
			identity.gamePass = hostPrefs.getGamePass();
			identity.characterKeyFingerprint = fingerprintCharacterKeys(hostPrefs.getGameObject());
		}

		identity.realmKey = computeRealmKey(identity);
		identity.realmKeySource = identity.realmKeySourceComputed;
		return identity;
	}

	private static String fingerprintCharacterKeys(GameObject hostPrefs) {
		ArrayList<String> list = hostPrefs.getAttributeList(HostPrefWrapper.HOST_PREF_BLOCK, HostPrefWrapper.CHARACTER_KEY);
		if (list == null || list.isEmpty()) return null;
		List<String> sorted = new ArrayList<>(list);
		Collections.sort(sorted);
		return String.join(";", sorted);
	}

	static String computeRealmKey(RealmIdentity id) {
		if (id.gamePort != null && !id.gamePort.isBlank()
				&& id.rseed != null && !id.rseed.isBlank()) {
			id.realmKeySourceComputed = "host_port_and_rseed";
			return sha256("port-seed:" + id.gamePort.trim() + "|" + id.rseed.trim());
		}
		if (id.gamePort != null && !id.gamePort.isBlank()) {
			id.realmKeySourceComputed = "host_game_port";
			return sha256("port:" + id.gamePort.trim());
		}
		String seedTitle = joinNonEmpty("|", id.rseed, id.gameTitle, id.gamePass);
		if (!seedTitle.isEmpty()) {
			id.realmKeySourceComputed = "rseed_and_host_title";
			return sha256("seed:" + seedTitle);
		}
		if (id.characterKeyFingerprint != null && !id.characterKeyFingerprint.isBlank()) {
			id.realmKeySourceComputed = "character_roster";
			return sha256("roster:" + id.characterKeyFingerprint);
		}
		if (id.rseed != null && id.gameName != null) {
			id.realmKeySourceComputed = "rseed_and_game_name";
			return sha256("solo:" + id.rseed + "|" + id.gameName);
		}
		id.realmKeySourceComputed = "unstable";
		throw new IllegalStateException(
				"Could not derive a stable realm identity from this save. Hosted games need gp__ in Host Preferences."
		);
	}

	private static String joinNonEmpty(String sep, String... parts) {
		StringBuilder sb = new StringBuilder();
		for (String p : parts) {
			if (p == null || p.isBlank()) continue;
			if (sb.length() > 0) sb.append(sep);
			sb.append(p.trim());
		}
		return sb.toString();
	}

	private static String sha256(String value) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
			StringBuilder hex = new StringBuilder();
			for (byte b : hash) {
				hex.append(String.format("%02x", b));
			}
			return hex.toString();
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}

	public static Map<String, Object> toManifestMap(RealmIdentity identity) {
		Map<String, Object> map = new LinkedHashMap<>();
		map.put("realmKey", identity.realmKey);
		map.put("realmKeySource", identity.realmKeySource);
		if (identity.gamePort != null) map.put("gamePort", identity.gamePort);
		if (identity.rseed != null) map.put("rseed", identity.rseed);
		if (identity.gameTitle != null) map.put("gameTitle", identity.gameTitle);
		return map;
	}
}
