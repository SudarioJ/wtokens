import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const guildId = process.env.DISCORD_GUILD_ID;

async function run() {
  const channels = await rest.get(Routes.guildChannels(guildId));
  const categories = channels.filter(c => c.type === 4).sort((a,b) => a.position - b.position);
  const uncategorized = channels.filter(c => !c.parent_id && c.type !== 4);

  if (uncategorized.length) {
    console.log("=== SIN CATEGORÍA ===");
    for (const c of uncategorized) console.log(`  - [${c.type}] ${c.name} (${c.id})`);
  }

  for (const cat of categories) {
    console.log(`\n=== CATEGORÍA: ${cat.name} (${cat.id}) ===`);
    const children = channels.filter(c => c.parent_id === cat.id).sort((a,b) => a.position - b.position);
    for (const c of children) {
      console.log(`  - [${c.type}] ${c.name} (${c.id})`);
    }
  }
}

run().catch(console.error);
