import { logger } from "bondage-club-bot-api";
import { LoggingLogic } from "./loggingLogic";

// Note:
// For more examples of events see src/loggingLogic.ts
// To use any more events, go to that file and copy the function, including the comment above it.

export class BotLogic extends LoggingLogic {
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

		if (message.Type === "Whisper" && message.Content.startsWith("!")) {
			const cmd = message.Content.split(" ");
			if (cmd[0] === "!help") {
				sender.Tell("Whisper", "CNBot version 1.0.0");
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
