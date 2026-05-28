package com.hundredacre.realm.export;

import java.util.Collection;
import java.util.Map;

/**
 * Minimal JSON writer (no external deps) for export bundles.
 */
public final class JsonUtil {
	private JsonUtil() {}

	public static String toJson(Object value) {
		StringBuilder sb = new StringBuilder();
		writeValue(sb, value, 0);
		return sb.toString();
	}

	public static void writeValue(StringBuilder sb, Object value, int indent) {
		if (value == null) {
			sb.append("null");
		} else if (value instanceof String) {
			sb.append('"').append(escape((String) value)).append('"');
		} else if (value instanceof Number || value instanceof Boolean) {
			sb.append(value);
		} else if (value instanceof Map<?, ?>) {
			writeObject(sb, (Map<?, ?>) value, indent);
		} else if (value instanceof Collection<?>) {
			writeArray(sb, (Collection<?>) value, indent);
		} else if (value.getClass().isArray()) {
			writeArray(sb, java.util.Arrays.asList((Object[]) value), indent);
		} else {
			sb.append('"').append(escape(String.valueOf(value))).append('"');
		}
	}

	private static void writeObject(StringBuilder sb, Map<?, ?> map, int indent) {
		sb.append("{\n");
		boolean first = true;
		for (Map.Entry<?, ?> e : map.entrySet()) {
			if (!first) sb.append(",\n");
			first = false;
			indent(sb, indent + 1);
			sb.append('"').append(escape(String.valueOf(e.getKey()))).append("\": ");
			writeValue(sb, e.getValue(), indent + 1);
		}
		sb.append('\n');
		indent(sb, indent);
		sb.append('}');
	}

	private static void writeArray(StringBuilder sb, Collection<?> list, int indent) {
		sb.append("[\n");
		boolean first = true;
		for (Object item : list) {
			if (!first) sb.append(",\n");
			first = false;
			indent(sb, indent + 1);
			writeValue(sb, item, indent + 1);
		}
		sb.append('\n');
		indent(sb, indent);
		sb.append(']');
	}

	private static void indent(StringBuilder sb, int level) {
		for (int i = 0; i < level; i++) sb.append("  ");
	}

	public static String escape(String s) {
		if (s == null) return "";
		StringBuilder sb = new StringBuilder(s.length() + 8);
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			switch (c) {
				case '\\': sb.append("\\\\"); break;
				case '"': sb.append("\\\""); break;
				case '\n': sb.append("\\n"); break;
				case '\r': sb.append("\\r"); break;
				case '\t': sb.append("\\t"); break;
				default:
					if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
					else sb.append(c);
			}
		}
		return sb.toString();
	}
}
