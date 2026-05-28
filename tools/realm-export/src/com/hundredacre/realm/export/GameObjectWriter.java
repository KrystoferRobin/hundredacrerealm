package com.hundredacre.realm.export;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.robin.game.objects.GameObject;
import com.robin.general.util.OrderedHashtable;

/**
 * Serializes GameObject trees (attribute blocks + held contents) for JSON export.
 */
public final class GameObjectWriter {
	private static final int DEFAULT_MAX_DEPTH = 8;

	private GameObjectWriter() {}

	public static Map<String, Object> toMap(GameObject go) {
		return toMap(go, DEFAULT_MAX_DEPTH);
	}

	public static Map<String, Object> toMap(GameObject go, int maxDepth) {
		Map<String, Object> map = new LinkedHashMap<>();
		if (go == null) return map;

		map.put("id", go.getId());
		map.put("name", go.getName());

		Map<String, Object> blocks = new LinkedHashMap<>();
		for (String blockName : go.getAttributeBlockNames()) {
			OrderedHashtable<?, ?> block = go.getAttributeBlocks().get(blockName);
			if (block == null) continue;
			Map<String, String> attrs = new LinkedHashMap<>();
			for (int i = 0; i < block.size(); i++) {
				String key = String.valueOf(block.getKey(i));
				Object val = block.getValue(i);
				if (val instanceof String) {
					attrs.put(key, (String) val);
				}
			}
			if (!attrs.isEmpty()) {
				blocks.put(blockName, attrs);
			}
		}
		if (!blocks.isEmpty()) {
			map.put("attributeBlocks", blocks);
		}

		if (maxDepth > 0 && go.getHoldCount() > 0) {
			List<Map<String, Object>> held = new ArrayList<>();
			for (Object o : go.getHold()) {
				if (o instanceof GameObject) {
					held.add(toMap((GameObject) o, maxDepth - 1));
				}
			}
			map.put("held", held);
			map.put("heldCount", held.size());
		}

		if (go.getHeldBy() != null) {
			map.put("heldById", go.getHeldBy().getId());
			map.put("heldByName", go.getHeldBy().getName());
		}

		return map;
	}
}
