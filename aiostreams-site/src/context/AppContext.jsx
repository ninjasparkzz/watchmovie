import { useEffect, useMemo, useState } from 'react';
import { AppContext } from './appContext';
import axios from 'axios';
import { accessConfig } from '../accessConfig';
import { cleanBaseUrl } from '../utils/streamUtils';

const STREAM_CONFIG_KEY = 'watchtv_stream_config';
const AUTH_KEY = 'watchtv_discord_auth';

const defaultConfig = {
  baseUrl: 'https://ninjasparkzz-watch-backend.hf.space',
  uuid: 'ce8fac10-5faa-4811-bc4f-ef4a71c220b3',
  password: 'eyJpIjoieDNZUm5zS09XZVJqZ3MwZkN1bC9NZz09IiwiZSI6ImdmdmxPMUxSc0ZVTTlJdU1PRWYvbWVsTVRIb0p5bFlWd0QyYWdsbCt5bVE9IiwidCI6ImEifQ',
};

function getConfiguredGuildIds() {
  return (accessConfig.discordGuildIds || []).filter((guildId) => (
    guildId && !guildId.includes('PASTE_')
  ));
}

function getConfiguredRoleIds() {
  return (accessConfig.allowedRoleIds || []).filter((roleId) => (
    roleId && !roleId.includes('PASTE_')
  ));
}

function isDiscordConfigured() {
  return Boolean(
    accessConfig.discordClientId
    && accessConfig.discordClientId !== 'PASTE_CLIENT_ID_HERE'
    && getConfiguredGuildIds().length > 0,
  );
}

function hasAllowedRole(auth) {
  const roleIds = getConfiguredRoleIds();
  if (!roleIds.length) return true;
  if (!auth || !Array.isArray(auth.roles)) return false;
  return auth.roles.some((roleId) => roleIds.includes(roleId));
}

function buildDiscordLoginUrl() {
  if (!isDiscordConfigured()) return '';
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams({
    client_id: accessConfig.discordClientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'identify guilds.members.read',
    prompt: 'none',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const savedStr = localStorage.getItem(STREAM_CONFIG_KEY);
      const saved = savedStr ? JSON.parse(savedStr) : {};
      const pass = saved?.password;
      const url = saved?.baseUrl;
      const isOld = typeof pass !== 'string' || !pass.startsWith('eyJpI');
      const isLocal = typeof url === 'string' && url.includes('localhost');
      if (isLocal || isOld) {
        localStorage.removeItem(STREAM_CONFIG_KEY);
        return defaultConfig;
      }
      return { ...defaultConfig, ...saved };
    } catch {
      return defaultConfig;
    }
  });

  const [draftConfig, setDraftConfig] = useState(config);
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [error, setError] = useState('');

  const canWatch = !isDiscordConfigured() || Boolean(auth && hasAllowedRole(auth));
  const loginUrl = useMemo(() => buildDiscordLoginUrl(), []);

  const hydrateDiscordSession = async (token) => {
    setError('');
    try {
      const guildIds = getConfiguredGuildIds();
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let memberData = null;
      for (const guildId of guildIds) {
        try {
          const response = await axios.get(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data) {
            memberData = response.data;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!memberData && guildIds.length > 0) {
        throw new Error('Not a member of allowed servers');
      }

      setAuth({ token, user: userResponse.data, roles: memberData?.roles || [] });
      setShowAccessModal(false);
    } catch (err) {
      setError(err.message === 'Not a member of allowed servers'
        ? 'You are not a member of the required Discord servers.'
        : 'Discord login worked, but we could not verify your membership.');
    }
  };

  useEffect(() => {
    localStorage.setItem(STREAM_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('access_token');
    if (!token) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    Promise.resolve().then(() => hydrateDiscordSession(token));
  }, []);

  const openSettings = () => {
    setDraftConfig(config);
    setShowSettings(true);
  };

  const saveSettings = () => {
    setConfig({
      baseUrl: cleanBaseUrl(draftConfig.baseUrl),
      uuid: draftConfig.uuid.trim(),
      password: draftConfig.password,
    });
    setShowSettings(false);
  };

  const logout = () => setAuth(null);

  const value = {
    config,
    draftConfig,
    setDraftConfig,
    auth,
    canWatch,
    loginUrl,
    error,
    setError,
    showSettings,
    setShowSettings,
    showAccessModal,
    setShowAccessModal,
    openSettings,
    saveSettings,
    logout,
    isDiscordConfigured,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
