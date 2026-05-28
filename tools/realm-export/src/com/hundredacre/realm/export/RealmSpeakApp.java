package com.hundredacre.realm.export;

/**
 * RealmSpeak applications exposed on the launcher tab.
 */
public enum RealmSpeakApp {
	MAIN_GAME(
			"Magic Realm",
			"Play RealmSpeak",
			"com.robin.magic_realm.RealmSpeak.RealmSpeakFrame",
			ClasspathMode.MAIL_AND_ACTIVATION,
			"/resources/images/logo/rs_logo.jpg",
			true
	),
	BATTLE(
			"Battle Builder",
			"Battle Builder",
			"com.robin.magic_realm.RealmBattle.CombatFrame",
			ClasspathMode.MAIL_AND_ACTIVATION,
			"/resources/images/combat/buttons/prebattle1.gif",
			false
	),
	CHARACTER_BUILDER(
			"Character Builder",
			"Character Builder",
			"com.robin.magic_realm.RealmCharacterBuilder.RealmCharacterBuilderFrame",
			ClasspathMode.MAIL_AND_ACTIVATION,
			"/resources/images/characters/wizard.png",
			false
	),
	GAME_MASTER(
			"GameMaster Editor",
			"GameMaster Editor",
			"com.robin.magic_realm.RealmGm.RealmGmFrame",
			ClasspathMode.FULL_ONLY,
			"/resources/images/characters/black_knight.png",
			false
	),
	QUEST_BUILDER(
			"Quest Builder",
			"Quest Builder",
			"com.robin.magic_realm.RealmQuestBuilder.QuestBuilderFrame",
			ClasspathMode.MAIL_AND_ACTIVATION,
			"/pending/tab/quest.gif",
			false
	),
	GAME_BUILDER(
			"Game Builder",
			"Game Builder",
			"com.robin.game.GameBuilder.GameBuilderFrame",
			ClasspathMode.FULL_ONLY,
			"/icons/document.gif",
			false
	),
	REALM_VIEWER(
			"Realm Viewer",
			"Realm Viewer",
			"com.robin.magic_realm.RealmSpeak.RealmViewer",
			ClasspathMode.FULL_ONLY,
			"/resources/images/logo/realmbox.jpg",
			false
	),
	TILE_EDITOR(
			"Tile Editor",
			"Tile Editor",
			"com.robin.magic_realm.RealmSpeak.TileEditFrame",
			ClasspathMode.FULL_ONLY,
			"/resources/images/tiles/grove1.gif",
			false
	);

	public enum ClasspathMode {
		MAIL_AND_ACTIVATION,
		FULL_ONLY
	}

	public final String menuLabel;
	public final String buttonLabel;
	public final String mainClass;
	public final ClasspathMode classpathMode;
	public final String imageResource;
	public final boolean primary;

	RealmSpeakApp(
			String menuLabel,
			String buttonLabel,
			String mainClass,
			ClasspathMode classpathMode,
			String imageResource,
			boolean primary) {
		this.menuLabel = menuLabel;
		this.buttonLabel = buttonLabel;
		this.mainClass = mainClass;
		this.classpathMode = classpathMode;
		this.imageResource = imageResource;
		this.primary = primary;
	}
}
