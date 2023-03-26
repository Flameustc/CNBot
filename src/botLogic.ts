import { logger } from "bondage-club-bot-api";
import { LoggingLogic } from "./loggingLogic";
import { BOT_ADMIN, ROOM_ADMIN, FORBIDDEN_WORDS } from "./secrets";
import * as fs from "fs";

interface Accusation {
	targetNumber: number;
	targetName: string;
	sourceNumber: number;
	sourceName: string;
	comment: string;
}

// Note:
// For more examples of events see src/loggingLogic.ts
// To use any more events, go to that file and copy the function, including the comment above it.

export class BotLogic extends LoggingLogic {

	private forbiddenWords: string[] = [...FORBIDDEN_WORDS];
	private accusations: Accusation[] = [];
	private dataFile: string = "./data/data.json";

	constructor(dataFile: string) {
		super();
		this.dataFile = dataFile;
		this.loadData();
	}

	private loadData(): void {
		this.accusations = JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));
	}

	private saveData(): void {
		void fs.writeFileSync(this.dataFile, JSON.stringify(this.accusations), "utf-8");
	}

	/**
	 * When character enters the room
	 * @param connection Originating connection
	 * @param character The character that entered the room
	 */
	protected onCharacterEntered(connection: API_Connector, character: API_Character): void {
		// Calling super.<name of function> will keep the log. If you don't want to log characters entering or want to do it yourself, remove this line
		super.onCharacterEntered(connection, character);
	}

	/**
	 * When connection receives message inside chatroom
	 * @param connection Originating connection
	 * @param message Received message
	 * @param sender The character that sent the message
	 */
	protected onMessage(connection: API_Connector, message: BC_Server_ChatRoomMessage, sender: API_Character): void {
		// Calling super.<name of function> will keep the log. If you don't want to log messages or want to do it yourself, remove this line
		super.onMessage(connection, message, sender);

		if (message.Type === "Whisper") {
			if (!message.Content.startsWith("!")) {
				sender.Tell("Whisper", "CNBot version 1.2.0");
				return;
			}
			const cmd = message.Content.split(" ");
			if (cmd[0] === "!help") {
				sender.Tell("Whisper", "CNBot version 1.2.0");
			}
			if (cmd[0] === "!forbid") {
				if (cmd.length >= 3 && cmd[1] === "add") {
					this.forbiddenWords.push(`${message.Content.substring(12)}`);
				} else if (cmd.length === 3 && cmd[1] === "del" && !isNaN(Number(cmd[2]))) {
					this.forbiddenWords.splice(Number(cmd[2]), 1);
				} else {
					let content: string[] = [];
					content = [
						"!forbid add <屏蔽词> 添加新屏蔽词",
						"!forbid del <N> 删除第N条屏蔽词（序号从0开始）",
						"当前屏蔽词："
					];
					sender.Tell("Chat", content.join("\n") + "\n" + this.forbiddenWords.join("\n\n"));
				}
			}
			if (cmd[0] === "!admin" && BOT_ADMIN.find(x => x === sender.MemberNumber)) {
				if (cmd[1] === "help") {
					const content = [
						"friendlist",
						"friendlistadd <MemberNumber>",
						"friendlistremove <MemberNumber>"
					];
					sender.Tell("Chat", content.join("\n"));
				}
				if (cmd[1] === "friendlist") {
					sender.Tell("Whisper", connection.Player.FriendList.join(", "));
					logger.info(`Friend list sent to ${sender.Name} (${sender.MemberNumber})`);
				}
				if (cmd[1] === "friendlistadd" && !isNaN(Number(cmd[2]))) {
					connection.Player.FriendListAdd(Number(cmd[2]));
					logger.info(`Add friend by ${sender.Name} (${sender.MemberNumber})`);
				}
				if (cmd[1] === "friendlistremove" && !isNaN(Number(cmd[2]))) {
					connection.Player.FriendListRemove(Number(cmd[2]));
					logger.info(`Remove friend by ${sender.Name} (${sender.MemberNumber})`);
				}
			}
		}

		if (!ROOM_ADMIN.includes(sender.MemberNumber) && this.forbiddenWords.some(w => message.Content.includes(w))) {
			void sender.Ban();
		}
	}

	protected onBeep(connection: API_Connector, beep: BC_Server_AccountBeep): void {
		super.onBeep(connection, beep);

		if (!beep.Message) return;

		const message = String(beep.Message);
		if (message.startsWith("!")) {
			const cmd = message.split(" ");
			if (cmd[0] === "!help") {
				let content: string[] = [];
				content = [
					"CNBot version 1.2.0",
					"!ban 用户名(用户编号) 理由：提交一个举报",
					"!check 用户编号：查询指定用户被举报的记录",
					"!list：查询有哪些用户曾被举报"
				];
				connection.AccountBeep(beep.MemberNumber, null, content.join("\n"), false);
			}
			if (cmd[0] === "!ban") {
				// !ban MemberName(MemberNumber) Reason
				const match = /\((\d+)\)/.exec(message);
				if (match !== null && !isNaN(Number(match[1]))) {
					const accusation: Accusation = {
						targetNumber: Number(match[1]),
						targetName: message.substring("!ban".length + 1, match.index).trim(),
						sourceNumber: beep.MemberNumber,
						sourceName: beep.MemberName,
						comment: message.substring(match.index + match[0].length).trim()
					};
					this.accusations.push(accusation);
					this.saveData();
					connection.AccountBeep(beep.MemberNumber, null, "收到", false);
				} else {
					connection.AccountBeep(beep.MemberNumber, null, "格式不正确\n!ban 用户名(用户编号) 理由\n!ban UserName(99999) 不打招呼就捆人还上高安锁", false);
				}
			}
			if (cmd[0] === "!check") {
				if (cmd.length === 2 && !isNaN(Number(cmd[1]))) {
					const memberNumber = Number(cmd[1]);
					const content = "查询结果：\n" +
						this.accusations.filter(x => x.targetNumber === memberNumber).map(x => `${x.sourceName}(${x.sourceNumber}): ${x.comment}`).join("\n");
					connection.AccountBeep(beep.MemberNumber, null, content, false);
				} else {
					connection.AccountBeep(beep.MemberNumber, null, "格式不正确\n!check 用户编号\n!check 99999", false);
				}
			}
			if (cmd[0] === "!list") {
				const content = "查询结果：\n" +
					Array.from(new Set(this.accusations.map(x => x.targetNumber))).join("\n");
				connection.AccountBeep(beep.MemberNumber, null, content, false);
			}
		}
	}

	/**
	 * When characters in room get moved around
	 * @param connection Originating connection
	 */
	protected onCharacterOrderChanged(connection: API_Connector): void {
		// Make sure bot is in first spot in the room
		if (connection.Player.IsRoomAdmin()) {
			logger.info("Moving to first spot in room!");
			void connection.Player.MoveToPos(0);
		}
	}
}
