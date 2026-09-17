# Discord Server Template Bot 🤖🛡️

<div align="center">
  <img src="https://img.shields.io/badge/discord.js-v14.15.0-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js Version">
  <img src="https://img.shields.io/badge/Node.js->=16.9.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Version">
  <img src="https://img.shields.io/badge/Developer-themurft-F1C40F?style=for-the-badge" alt="Developer">
  <a href="https://discord.gg/6C5t995jC6"><img src="https://img.shields.io/badge/Support-Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Support"></a>
</div>

---

A powerful, modular Discord bot built with **Discord.js v14** designed to completely wipe and automatically reconstruct Discord server layouts (roles, categories, channels, limits, topics, and permissions) dynamically from JSON templates.

Developed by **[themurft](https://github.com/themurft)**. Join our **[Discord Server](https://discord.gg/6C5t995jC6)** for support or contact.

---

## ✨ Features

- 🧹 **Complete Clean Sweep**: Safely and sequentially deletes all channels, categories, and custom roles (except the bot's own highest role, managed integration roles, and `@everyone`).
- 📁 **Dynamic Template Loader**: Dynamically scans, registers, and reads configurations from the `templates/` folder without needing a reboot.
- 🛠️ **Advanced Layout Settings**:
  - Automatically applies text channel **topics/descriptions**.
  - Configures voice channel **user limits**.
  - Creates **restricted permissions** (`restrictedTo` fields) to hide channels/categories from `@everyone` and restrict access to specific custom roles.
- ⚙️ **Modern JavaScript**: Developed in ES6+ utilizing clean, robust `async/await` handling to dodge Discord API rate limit traps.

---

## 📁 Project Directory Structure

```
├── index.js
├── config.json
├── package.json
├── README.md
└── templates/
    ├── minecraft.json
    ├── content-creator.json
    ├── casual.json
    ├── study-productivity.json
    ├── events.json
    └── video.json
```

---

## 📋 Available Templates

1. **`minecraft`**: Tailored for Minecraft Networks. Features game lobbies, public voice channels, VIP areas, and moderator desks.
2. **`content-creator`**: Tailored for Streamers and Content Creators. Includes live/video alert channels, community rooms, sub/VIP zones, and support desks.
3. **`casual`**: Cozy layout for a group of friends. Features lounge rooms, media sharing, game rooms, and a secret best-friends-only area.
4. **`study-productivity`**: Tailored for students, classrooms, and focus hubs. Features academic topics, Pomodoro study lounges, daily goals, and tutor support sections.
5. `events` : Designed to organize and manage a complete event. Includes announcements, schedules, participation, prizes, event media, staff organization, and voice channels.
6. `video` : Temporary server template for a single video project. Includes announcements, schedules, resources, community channels, staff organization, and voice channels.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v16.11.0 or higher.
- A Discord Bot Token (obtainable from the [Discord Developer Portal](https://discord.com/developers/applications)).
- The bot must be invited to your server with **Administrator** permissions.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Configuration
Open `config.json` and insert your Discord bot token and command prefix:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN_HERE",
  "prefix": "!"
}
```

### 4. Running the Bot
```bash
npm start
```

---

## 🎮 Commands

| Command | Description | Permissions Required |
| :--- | :--- | :--- |
| `!list` | Dynamically loads and displays an elegant embed containing all templates found inside the `/templates` directory. | None (Public) |
| `!show <template_name>` | Displays a beautiful embed previewing the selected template's roles, permissions, channels, and layout configuration. | None (Public) |
| `!setup <template_name>` | **WARNING: WIPES SERVER CHANNELS AND ROLES.** Installs the selected layout template on the server. | **Server Owner** |

---

## 💬 Support & Contact

If you have any questions, encounter issues, or want to suggest new features, join our official community support server:

💬 **[Join the Discord Support Server](https://discord.gg/6C5t995jC6)**

---

## 📄 License

This project is licensed under the ISC License. Feel free to use and modify it!

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/themurft">themurft</a></p>
</div>
