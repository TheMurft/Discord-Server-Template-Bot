const { 
  Client, 
  Events,
  GatewayIntentBits, 
  EmbedBuilder, 
  PermissionsBitField, 
  ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Initialize the Discord Client with required gateway intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Path to the templates directory
const templatesDir = path.join(__dirname, 'templates');

// Load templates dynamically from the templates folder
function loadTemplates() {
  const templates = {};
  try {
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir);
    }
    const files = fs.readdirSync(templatesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(templatesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const templateData = JSON.parse(fileContent);
        const templateKey = path.basename(file, '.json').toLowerCase();
        templates[templateKey] = {
          fileName: file,
          name: templateData.templateName || templateData.name || file,
          description: templateData.description || 'No description provided.',
          data: templateData
        };
      }
    }
  } catch (error) {
    console.error('Error loading templates:', error);
  }
  return templates;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
  console.log('Templates loaded successfully.');
});

client.on('messageCreate', async (message) => {
  // Ignore messages from bots or messages that don't start with the prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Load latest templates from folder on each execution
  const templates = loadTemplates();

  // !list Command
  if (command === 'list') {
    const embed = new EmbedBuilder()
      .setTitle('Available Server Templates')
      .setDescription('Use `!setup <template_name>` to apply a template. **WARNING**: This will completely wipe the server structure!')
      .setColor('#3498DB')
      .setTimestamp();

    if (Object.keys(templates).length === 0) {
      embed.setDescription('No templates found in the templates directory.');
    } else {
      for (const [key, template] of Object.entries(templates)) {
        embed.addFields({ 
          name: `📋 ${template.name} (\`${key}\`)`, 
          value: template.description 
        });
      }
    }

    return message.reply({ embeds: [embed] });
  }

  // !setup Command
  if (command === 'setup') {
    // Permission check: Must be the Server Owner
    if (message.author.id !== message.guild.ownerId) {
      return message.reply('❌ This command can only be executed by the **Server Owner**.');
    }

    // Check if bot has Administrator permission
    const botMember = message.guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ The bot requires **Administrator** permissions to wipe and set up the server.');
    }

    const templateName = args[0]?.toLowerCase();
    if (!templateName) {
      return message.reply(`❌ Please specify a template name. Usage: \`${config.prefix}setup <template_name>\`. Run \`${config.prefix}list\` to see available templates.`);
    }

    const template = templates[templateName];
    if (!template) {
      return message.reply(`❌ Template \`${templateName}\` not found. Run \`${config.prefix}list\` to see available templates.`);
    }

    const guild = message.guild;

    try {
      // Step 1: Notify start of wiping process
      await message.reply('🔄 **Initiating server setup...**\n⚠️ *Deleting old structure (roles, categories, channels)...*');

      // Step 2: Wipe all Channels (Text, Voice, Categories)
      console.log(`Wiping channels in guild: ${guild.name}`);
      const channels = await guild.channels.fetch();
      for (const [_, channel] of channels) {
        if (channel) {
          try {
            await channel.delete('Server template wipe');
          } catch (err) {
            console.error(`Failed to delete channel ${channel.name}:`, err.message);
          }
        }
      }

      // Step 3: Wipe all custom Roles
      console.log(`Wiping custom roles in guild: ${guild.name}`);
      const roles = await guild.roles.fetch();
      const botHighestRole = botMember.roles.highest;

      for (const [_, role] of roles) {
        // Do not delete @everyone, managed roles (bot/integration roles), or roles higher/equal to bot's highest role
        if (
          role.id !== guild.id && 
          !role.managed && 
          role.comparePositionTo(botHighestRole) < 0
        ) {
          try {
            await role.delete('Server template wipe');
          } catch (err) {
            console.error(`Failed to delete role ${role.name}:`, err.message);
          }
        }
      }

      // Step 4: Create new Roles
      console.log('Creating roles from template...');
      const roleMapping = {}; // Keep a map of role name -> role object for permission overrides later
      
      if (template.data.roles && Array.isArray(template.data.roles)) {
        for (const roleDef of template.data.roles) {
          try {
            const permissions = [];
            if (roleDef.permissions && Array.isArray(roleDef.permissions)) {
              for (const permName of roleDef.permissions) {
                if (PermissionsBitField.Flags[permName]) {
                  permissions.push(PermissionsBitField.Flags[permName]);
                }
              }
            }

            const createdRole = await guild.roles.create({
              name: roleDef.name,
              colors: roleDef.color || '#99AAB5',
              hoist: roleDef.hoist || false,
              permissions: permissions,
              reason: 'Template installation: role creation'
            });
            roleMapping[roleDef.name] = createdRole;
          } catch (err) {
            console.error(`Failed to create role ${roleDef.name}:`, err);
          }
        }
      }

      // Step 5: Create Categories and Channels
      console.log('Creating categories and channels...');
      let progressChannel = null;

      if (template.data.categories && Array.isArray(template.data.categories)) {
        for (const catDef of template.data.categories) {
          try {
            // Apply category permission overrides if restrictedTo is defined
            const catOverwrites = [];
            if (catDef.restrictedTo && Array.isArray(catDef.restrictedTo)) {
              catOverwrites.push({
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              });
              for (const rName of catDef.restrictedTo) {
                const targetRole = roleMapping[rName];
                if (targetRole) {
                  catOverwrites.push({
                    id: targetRole.id,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                  });
                }
              }
            }

            // Create the Category
            const category = await guild.channels.create({
              name: catDef.name,
              type: ChannelType.GuildCategory,
              permissionOverwrites: catOverwrites.length > 0 ? catOverwrites : undefined,
              reason: 'Template installation: category creation'
            });

            // Create channels under this Category
            if (catDef.channels && Array.isArray(catDef.channels)) {
              for (const chanDef of catDef.channels) {
                const isVoice = chanDef.type === 'GuildVoice';
                
                // Build channel permission overrides
                const chanOverwrites = [];
                if (chanDef.restrictedTo && Array.isArray(chanDef.restrictedTo)) {
                  chanOverwrites.push({
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                  });
                  for (const rName of chanDef.restrictedTo) {
                    const targetRole = roleMapping[rName];
                    if (targetRole) {
                      chanOverwrites.push({
                        id: targetRole.id,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                      });
                    }
                  }
                }

                const channelOptions = {
                  name: chanDef.name,
                  type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
                  parent: category.id,
                  reason: 'Template installation: channel creation'
                };

                if (!isVoice && chanDef.topic) {
                  channelOptions.topic = chanDef.topic;
                }

                if (isVoice && chanDef.userLimit) {
                  channelOptions.userLimit = chanDef.userLimit;
                }

                if (chanOverwrites.length > 0) {
                  channelOptions.permissionOverwrites = chanOverwrites;
                }

                const createdChannel = await guild.channels.create(channelOptions);

                // Save the first text channel to send the completion and progress messages
                if (!isVoice && !progressChannel) {
                  progressChannel = createdChannel;
                  await progressChannel.send('🛠️ **Creating Channels...**');
                }
              }
            }
          } catch (err) {
            console.error(`Failed to create category/channel for ${catDef.name}:`, err);
          }
        }
      }

      // Step 6: Setup Complete Notification
      const completeEmbed = new EmbedBuilder()
        .setTitle('✅ Setup Complete!')
        .setDescription(`Server has been successfully configured using the **${template.name}** template.`)
        .setColor('#2ECC71')
        .addFields(
          { name: '👤 Executed by', value: `<@${message.author.id}>`, inline: true },
          { name: '📋 Template', value: `\`${templateName}\``, inline: true }
        )
        .addFields(
          { name: '⭐ Enjoy the bot?', value: 'Give us a star on [GitHub](https://github.com/TheMurft/Discord-Server-Template-Bot) and join our [Discord Support Server](https://discord.gg/6C5t995jC6)!' }
        )
        .setFooter({ text: 'Thank you for using Discord Server Template Bot • themurft' })
        .setTimestamp();

      if (progressChannel) {
        await progressChannel.send({ content: `<@${message.author.id}>`, embeds: [completeEmbed] });
      } else {
        const remainingChannels = await guild.channels.fetch();
        const firstTextChannel = remainingChannels.find(c => c.type === ChannelType.GuildText);
        if (firstTextChannel) {
          await firstTextChannel.send({ content: `<@${message.author.id}>`, embeds: [completeEmbed] });
        }
      }
      console.log('Server template installation completed.');

    } catch (err) {
      console.error('Error during setup execution:', err);
      // Try to report error to guild owner if possible, or print to console
      try {
        const owner = await guild.fetchOwner();
        if (owner) {
          await owner.send(`❌ An error occurred during the server setup process on **${guild.name}**: \`${err.message}\``);
        }
      } catch (ownerErr) {
        console.error('Could not notify owner:', ownerErr.message);
      }
    }
  }

  // !show Command
  if (command === 'show') {
    const templateName = args[0]?.toLowerCase();
    if (!templateName) {
      return message.reply(`❌ Please specify a template name. Usage: \`${config.prefix}show <template_name>\`. Run \`${config.prefix}list\` to see templates.`);
    }

    const template = templates[templateName];
    if (!template) {
      return message.reply(`❌ Template \`${templateName}\` not found. Run \`${config.prefix}list\` to see available templates.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Template Preview: ${template.name}`)
      .setDescription(template.description)
      .setColor('#9B59B6')
      .setTimestamp();

    // Roles display
    if (template.data.roles && Array.isArray(template.data.roles)) {
      const rolesList = template.data.roles.map(r => {
        const perms = r.permissions && r.permissions.length > 0 
          ? `\`[${r.permissions.join(', ')}]\`` 
          : '*None*';
        return `• **${r.name}** (${r.color}) - Permissions: ${perms}`;
      }).join('\n');
      embed.addFields({ name: '👥 Roles & Permissions', value: rolesList || '*No roles defined*' });
    }

    // Categories & Channels display
    if (template.data.categories && Array.isArray(template.data.categories)) {
      let structureStr = '';
      for (const cat of template.data.categories) {
        const restricted = cat.restrictedTo ? ` 🔒 *(${cat.restrictedTo.join(', ')})*` : '';
        structureStr += `📂 **${cat.name}**${restricted}\n`;
        
        if (cat.channels && Array.isArray(cat.channels)) {
          for (const chan of cat.channels) {
            const cIcon = chan.type === 'GuildVoice' ? '🔊' : '#️⃣';
            const cRestricted = chan.restrictedTo ? ` 🔒 *(${chan.restrictedTo.join(', ')})*` : '';
            const cLimit = chan.userLimit ? ` [Limit: ${chan.userLimit}]` : '';
            structureStr += `  └─ ${cIcon} \`${chan.name}\`${cLimit}${cRestricted}\n`;
          }
        }
        structureStr += '\n';
      }
      
      // Split into multiple fields if too long, or clamp it
      if (structureStr.length > 1024) {
        structureStr = structureStr.substring(0, 1021) + '...';
      }
      embed.addFields({ name: '📂 Categories & Channels', value: structureStr || '*No channels defined*' });
    }

    return message.reply({ embeds: [embed] });
  }
});

// Log in to Discord
if (config.token && config.token !== 'YOUR_BOT_TOKEN_HERE') {
  client.login(config.token).catch(err => {
    console.error('Failed to log in to Discord. Please check your token in config.json.', err);
  });
} else {
  console.log('Please configure your bot token in config.json to run the bot.');
}
