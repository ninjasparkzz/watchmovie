// Public access configuration. Add the Discord role ids that are allowed to watch.
// For real production security, enforce the same ids on your backend/proxy too.
export const accessConfig = {
  discordClientId: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
  discordGuildId: import.meta.env.VITE_DISCORD_GUILD_ID || '',
  allowedRoleIds: [
    // '123456789012345678',
  ],
};
