module.exports = {
	name: "profile",
	alias: ["p"],
	category: "general",
	desc: "Show this sender's information",
	async exec({ sock, db, msg }) {
		const { from, sender, isGroup } = msg;
		if (!isGroup) return await msg.reply("Only can be executed in group");

		try {
			try {
				pp = await sock.profilePictureUrl(sender, "image");
			} catch {
				pp = "https://www.elegantthemes.com/blog/wp-content/uploads/2020/02/000-404.png";
			}
            EXP = await db.get(sender).xp || 0
			let text = `\`\`\`\nNAME: ${msg.pushName}\nEXP: ${EXP}}\nID: ${sender}`

			await sock.sendMessage(from, { image: { url: pp }, caption: text }, { quoted: msg });
		} catch {
			await msg.reply("Something bad happend");
		}
	},
};
