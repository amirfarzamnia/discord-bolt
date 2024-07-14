# Discord Bolt

Discord Bolt is a high-performance Node.js library tailored for building Discord bots with speed and simplicity in mind.

---

Discord Bolt stands out as the fastest and most straightforward library for creating Discord bots in Node.js. Originally developed for handling complex tasks at [Bot Studio](https://botstudioo.com), it's heavily optimized for efficiency. Every feature directly mirrors the functionality outlined in the [Discord API documentation](https://discord.com/developers/docs), ensuring seamless integration and comprehensive coverage.

Designed to be lightweight and optimized for speed, Discord Bolt minimizes complexity, making it easier to work with compared to other Discord libraries. By interfacing directly with [Discord's official APIs](https://discord.com/developers/docs), Discord Bolt eliminates the need for additional documentation beyond what Discord itself provides.

## Key Features

- **Client for Event Handling:** Listen for incoming events and react accordingly.
- **API Client:** Send requests directly to Discord's API services.
- **Efficiency:** Optimized and compressed for minimal overhead.

## Getting Started Example

```javascript
import { Client, API } from "discord-bolt";

const token = "YOUR_DISCORD_BOT_TOKEN";

const api = new API(token);
const client = new Client(token, { intents: 512 });

client.connect();

client.on("MESSAGE_CREATE", ({ author, channel_id }) => !author.bot && api.createMessage({ channel_id, content: "Hello World!" }));
```

## Intents Management

Intents specify which events your bot wishes to receive from Discord. Discord Bolt uses a numeric approach for intents, such as `512` for `GUILD_MESSAGES`. Calculate intents using external tools like [Discord Intents Calculator](https://discord-intents-calculator.vercel.app) and directly input them into Discord Bolt.

## Customizing API Version

By default, Discord Bolt uses `v10` of [Discord's API endpoints](https://discord.com/developers/docs). Customize the version using:

```javascript
const api = new API("YOUR_DISCORD_BOT_TOKEN", { version: 10 });
const client = new Client("YOUR_DISCORD_BOT_TOKEN", { version: 10 });
```

## Explore Source

- [API Client Implementation](../handlers/api.js)
- [Client Implementation](../handlers/client.js)
- [All methods and their required parameters](../json/methods.json)
