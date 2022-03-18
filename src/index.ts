import { AssetGet, Connect, Init, logger, AddFileOutput, LogLevel, SetConsoleOutput, logConfig } from "bondage-club-bot-api";
import { BotLogic } from "./botLogic";
import { USERNAME, PASSWORD, ADMIN, BANLIST } from "./secrets";

import * as fs from "fs";

// To reduce loglevel, change it here
SetConsoleOutput(LogLevel.DEBUG);

//#region Logging into files
const time = new Date();
const timestring = `${time.getFullYear() % 100}${(time.getMonth() + 1).toString().padStart(2, "0")}${time.getDate().toString().padStart(2, "0")}_` +
	`${time.getHours().toString().padStart(2, "0")}${time.getMinutes().toString().padStart(2, "0")}`;
const logPrefix = `${timestring}_${process.pid}`;

fs.mkdirSync(`./data/logs`, { recursive: true });
AddFileOutput(`./data/logs/${logPrefix}_debug.log`, false, LogLevel.DEBUG);
AddFileOutput(`./data/logs/${logPrefix}_error.log`, true, LogLevel.ALERT);
//#endregion

let conn: API_Connector | null = null;
let botLogic: BotLogic | null = null;

async function run() {
	conn = await Connect(USERNAME, PASSWORD);

	botLogic = new BotLogic();
	conn.logic = botLogic;

	// These just expose some things in debug console
	// @ts-ignore: dev
	global.AssetGet = AssetGet;
	// @ts-ignore: dev
	global.conn = conn;
	// @ts-ignore: dev
	global.logic = botLogic;

	// To work properly bot *needs* to be room admin!
	await conn.ChatRoomJoinOrCreate({
		Name: "CN",
		Description: "姑苏城外寒山寺，夜半钟声到客船",
		Background: "Yacht1",
		Limit: 10,
		Private: true,
		Locked: false,
		Admin: [conn.Player.MemberNumber, ...ADMIN],
		Ban: [...BANLIST],
		Game: "",
		BlockCategory: []
	});

	logger.alert("Ready!");
}

Init()
	.then(run, err => {
		logger.fatal("Init rejected:", err);
	})
	.catch(err => {
		logger.fatal("Error while running:", err);
	});

logConfig.onFatal.push(() => {
	conn?.disconnect();
	conn = null;
	botLogic = null;
});

process.once("SIGINT", () => {
	logger.fatal("Interrupted");
});
