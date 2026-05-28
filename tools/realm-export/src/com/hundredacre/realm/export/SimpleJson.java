package com.hundredacre.realm.export;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Minimal JSON reader/writer for flat string maps (settings file only).
 */
public final class SimpleJson {
	private static final Pattern PAIR = Pattern.compile(
			"\"((?:\\\\.|[^\"\\\\])*)\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"",
			Pattern.DOTALL);

	private SimpleJson() {}

	public static Map<String, String> parseFlatObject(String json) {
		Map<String, String> out = new LinkedHashMap<>();
		if (json == null || json.isBlank()) {
			return out;
		}
		Matcher m = PAIR.matcher(json);
		while (m.find()) {
			out.put(unescape(m.group(1)), unescape(m.group(2)));
		}
		return out;
	}

	public static String toFlatObject(Map<String, String> map) {
		StringBuilder sb = new StringBuilder();
		sb.append("{\n");
		boolean first = true;
		for (Map.Entry<String, String> e : map.entrySet()) {
			if (!first) {
				sb.append(",\n");
			}
			first = false;
			sb.append("  \"").append(JsonUtil.escape(e.getKey())).append("\": \"")
					.append(JsonUtil.escape(e.getValue() == null ? "" : e.getValue())).append('"');
		}
		sb.append("\n}\n");
		return sb.toString();
	}

	private static String unescape(String s) {
		StringBuilder sb = new StringBuilder(s.length());
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			if (c == '\\' && i + 1 < s.length()) {
				char n = s.charAt(++i);
				switch (n) {
					case '\\': sb.append('\\'); break;
					case '"': sb.append('"'); break;
					case 'n': sb.append('\n'); break;
					case 'r': sb.append('\r'); break;
					case 't': sb.append('\t'); break;
					case 'u':
						if (i + 4 < s.length()) {
							String hex = s.substring(i + 1, i + 5);
							sb.append((char) Integer.parseInt(hex, 16));
							i += 4;
						}
						break;
					default: sb.append(n);
				}
			} else {
				sb.append(c);
			}
		}
		return sb.toString();
	}
}
