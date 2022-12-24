
module.exports = {
	name: "groupinfo",
	alias: ["gcinfo", "grupinfo", "grupstats", "groupstats", "gcstats"],
	category: "group",
	desc: "Show this group information",
	async exec({ sock, msg }) {
		const { from, isGroup } = msg;
		if (!isGroup) return await msg.reply("Only can be executed in group");

		try {
			const gcMeta = isGroup ? await sock.groupMetadata(from) : "";
			let dataConf = await getData(from.split("@")[0]);
			let ppGroup;
			if (typeof dataConf !== "object") dataConf = {};
			try {
				ppGroup = await sock.profilePictureUrl(from, "image");
			} catch {
				ppGroup = "https://www.elegantthemes.com/blog/wp-content/uploads/2020/02/000-404.png";
			}

			let text = `\`\`\`\nSubject: ${gcMeta?.subject}\nOwner: ${gcMeta?.owner}\nID: ${gcMeta?.id}\nSize: ${gcMeta?.participants?.length}\n`;
			text += `Created: ${new Date(gcMeta?.creation * 1000).toLocaleString()} \n`;
			text += `Desc:\n${gcMeta?.desc ? gcMeta?.desc?.toString() : "Empty"}\`\`\``;

			await sock.sendMessage(from, { image: { url: ppGroup }, caption: text }, { quoted: msg });
		} catch {
			await msg.reply("Something bad happend");
		}
	},
};
