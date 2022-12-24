const { getBinaryNodeChild } = require("@adiwajshing/baileys");
const { serialize } = require("../lib/helper");
const djs = require("../lib/Collection");
const { color } = require("../utils");
const { owner } = require("../config.json");

const cooldown = new djs.Collection();
const prefix = "!";

function printSpam(isGc, sender, gcName) {
	if (isGc) {
		return console.log(color("[SPAM]", "red"), color(sender.split("@")[0], "lime"), "in", color(gcName, "lime"));
	}
	if (!isGc) {
		return console.log(color("[SPAM]", "red"), color(sender.split("@")[0], "lime"));
	}
}

function printLog(isCmd, sender, gcName, isGc) {
	if (isCmd && isGc) {
		return console.log(color("[EXEC]", "aqua"), color(sender.split("@")[0], "lime"), "in", color(gcName, "lime"));
	}
	if (isCmd && !isGc) {
		return console.log(color("[EXEC]", "aqua"), color(sender.split("@")[0], "lime"));
	}
}

module.exports = chatHandler = async (m, db, sock) => {
	try {
		if (m.type !== "notify") return;
		let msg = serialize(JSON.parse(JSON.stringify(m.messages[0])), sock);
		if (!msg.message) return;
		if (msg.key && msg.key.remoteJid === "status@broadcast") return;
		if (
			msg.type === "protocolMessage" ||
			msg.type === "senderKeyDistributionMessage" ||
			!msg.type ||
			msg.type === ""
		)
			return;

		let { body } = msg;
		const { isGroup, sender, from } = msg;
		const gcMeta = isGroup ? await sock.groupMetadata(from) : "";
		const gcName = isGroup ? gcMeta.subject : "";
		const isOwner = owner.includes(sender) || msg.isSelf;

		// no group invite
		let temp_pref = prefix.test(body) ? body.split("").shift() : "!";
		if (body === "prefix" || body === "cekprefix") {
			msg.reply(`My prefix ${prefix}`);
		}
		if (body) {
			body = body.startsWith(temp_pref) ? body : "";
		} else {
			body = "";
		}

		const arg = body.substring(body.indexOf(" ") + 1);
		const args = body.trim().split(/ +/).slice(1);
		const isCmd = body.startsWith(temp_pref);

		// Log
		printLog(isCmd, sender, gcName, isGroup);

		const cmdName = body.slice(temp_pref.length).trim().split(/ +/).shift().toLowerCase();
		const cmd = djs.commands.get(cmdName) || djs.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
		if (!cmd) return await sock.sendMessage(
			from,
			{ text: `Sorry you are using an unlisted command.\nUse !help to see teh command list` },
			{ quoted: msg }
		);;

		if (cmd.owner && !isOwner) {
			return await msg.reply("You are not my owner");
		}
        let xp = Math.floor(Math.random() * 10) + 1
        await db.add(`${sender}.xp`, xp)
        const reactionMessage = {
            react: {
                text: `✅`,
                key: msg.key,
            },
        };
        await sock.sendMessage(from, reactionMessage);
		if (!cooldown.has(from)) {
			cooldown.set(from, new djs.Collection());
		}
		const now = Date.now();
		const timestamps = cooldown.get(from);
		const cdAmount = (cmd.cooldown || 5) * 1000;
		if (timestamps.has(from)) {
			const expiration = timestamps.get(from) + cdAmount;

			if (now < expiration) {
				if (isGroup) {
					let timeLeft = (expiration - now) / 1000;
					printSpam(isGroup, sender, gcName);
					return await sock.sendMessage(
						from,
						{ text: `This group is on cooldown, please wait another _${timeLeft.toFixed(1)} second(s)_` },
						{ quoted: msg }
					);
				} else if (!isGroup) {
					let timeLeft = (expiration - now) / 1000;
					printSpam(isGroup, sender);
					return await sock.sendMessage(
						from,
						{ text: `You are on cooldown, please wait another _${timeLeft.toFixed(1)} second(s)_` },
						{ quoted: msg }
					);
				}
			}
		}
		timestamps.set(from, now);
		setTimeout(() => timestamps.delete(from), cdAmount);

		try {
			// execute
			cmd.exec({ sock, msg, args, arg, isOwner });
		} catch (e) {
			console.error(e);
		}
	} catch (e) {
		console.log(
			color("[Err]", "red"),
			e.stack + "\nerror while handling chat event, might some message not answered"
		);
	}
};
