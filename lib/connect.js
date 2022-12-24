const {
	default: WASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestWaWebVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const cron = require("node-cron");
const djs = require("./Collection");
const fs = require("fs");
const path = require("path").join;
const store = require("./store");
const moment = require("moment-timezone");
const { Boom } = require("@hapi/boom");
const { color } = require("../utils");
const chatHandler = require("../event/chat_event");
const { QuickDB } = require('quick.db');
const db = new QuickDB(); // using default driver

if (!fs.existsSync("./config.json")) {
	throw Error("config file not found, please rename 'config.json.example' to 'config.json'");
}
const { session, chat_store, user_db, timezone, tier } = require("../config.json");
djs.commands = new djs.Collection();

// command
function readCommand() {
	let $rootDir = path(__dirname, "../command");
	let dir = fs.readdirSync($rootDir);
	let tierSum = Object.keys(tier).length;

	dir.forEach(($dir) => {
		const commandFiles = fs.readdirSync(path($rootDir, $dir)).filter((file) => file.endsWith(".js"));
		for (let file of commandFiles) {
			const command = require(path($rootDir, $dir, file));
			djs.commands.set(command.name, command);
		}
	});
	console.log(color("[SYS]", "yellow"), "command loaded!");
}
readCommand();

const connect = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(path("./session"));
	let { version, isLatest } = await fetchLatestWaWebVersion();
	console.log(`Using: ${version}, newer: ${isLatest}`);
	const sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: "silent" }),
		version,
	});
	store.bind(sock.ev);
	sock.chats = store.chats;

	// creds.update
	sock.ev.on("creds.update", saveCreds);

	// connection.update
	sock.ev.on("connection.update", async (up) => {

		const { lastDisconnect, connection } = up;
		if (connection) {
			console.log("Connection Status: ", connection);
		}

		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(`Bad Session File, Please Delete ${session} and Scan Again`);
				sock.logout();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				connect();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				connect();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log(`Device Logged Out, Please Delete ${session} and Scan Again.`);
				sock.logout();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				connect();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				connect();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
			}
		}
	});
	// messages.upsert
	sock.ev.on("messages.upsert", async (m) => {
		chatHandler(m, db, sock);
	});

};
connect();
