import { useEffect, useMemo, useState } from 'react';
import { useApp } from './useApp';
import { CommunityContext } from './communityContext';

const PICKS_KEY = 'watchtv_community_picks';
const ACTIVITY_KEY = 'watchtv_community_activity';
const PROFILE_KEY = 'watchtv_member_profile';
const ADMIN_KEY = 'watchtv_community_admin';
const PARTY_KEY = 'watchtv_watch_parties';

const fallbackPicks = [
  { id: 'tt15398776', type: 'movie', name: 'Oppenheimer', poster: 'https://images.metahub.space/poster/medium/tt15398776/img', votes: 12 },
  { id: 'tt1375666', type: 'movie', name: 'Inception', poster: 'https://images.metahub.space/poster/medium/tt1375666/img', votes: 9 },
  { id: 'tt0903747', type: 'series', name: 'Breaking Bad', poster: 'https://images.metahub.space/poster/medium/tt0903747/img', votes: 7 },
];

const fallbackActivity = [
  { id: 'seed-1', actor: 'WatchTV', action: 'opened community voting', detail: 'Movie night picks are live.', createdAt: Date.now() - 1000 * 60 * 18 },
  { id: 'seed-2', actor: 'WatchTV', action: 'featured', detail: 'Oppenheimer', createdAt: Date.now() - 1000 * 60 * 54 },
];

const defaultAdmin = {
  announcement: 'Vote for this week\'s community pick.',
  featuredTitle: 'Community Night',
  allowMemberParties: true,
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getDiscordName(auth) {
  return auth?.user?.global_name || auth?.user?.username || 'Guest member';
}

function getDiscordAvatar(auth) {
  const user = auth?.user;
  if (!user?.id || !user?.avatar) return '';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

export function CommunityProvider({ children }) {
  const { auth } = useApp();
  const [picks, setPicks] = useState(() => readJson(PICKS_KEY, fallbackPicks));
  const [activity, setActivity] = useState(() => readJson(ACTIVITY_KEY, fallbackActivity));
  const [profile, setProfile] = useState(() => readJson(PROFILE_KEY, {
    favoriteGenres: ['Action', 'Sci-Fi'],
    status: 'Ready for movie night',
  }));
  const [adminSettings, setAdminSettings] = useState(() => readJson(ADMIN_KEY, defaultAdmin));
  const [parties, setParties] = useState(() => readJson(PARTY_KEY, []));

  const member = useMemo(() => ({
    name: getDiscordName(auth),
    avatar: getDiscordAvatar(auth),
    username: auth?.user?.username || '',
    isSignedIn: Boolean(auth),
  }), [auth]);

  useEffect(() => localStorage.setItem(PICKS_KEY, JSON.stringify(picks)), [picks]);
  useEffect(() => localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity)), [activity]);
  useEffect(() => localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem(ADMIN_KEY, JSON.stringify(adminSettings)), [adminSettings]);
  useEffect(() => localStorage.setItem(PARTY_KEY, JSON.stringify(parties)), [parties]);

  const addActivity = (action, detail, actor = member.name) => {
    setActivity((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        actor,
        action,
        detail,
        createdAt: Date.now(),
      },
      ...current,
    ].slice(0, 40));
  };

  const voteForTitle = (title) => {
    if (!title?.id) return;
    setPicks((current) => {
      const existing = current.find((pick) => pick.id === title.id);
      if (existing) {
        return current
          .map((pick) => (pick.id === title.id ? { ...pick, votes: (pick.votes || 0) + 1 } : pick))
          .sort((a, b) => (b.votes || 0) - (a.votes || 0));
      }
      return [
        {
          id: title.id,
          type: title.type || 'movie',
          name: title.name || title.title || 'Untitled',
          poster: title.poster || '',
          votes: 1,
        },
        ...current,
      ];
    });
    addActivity('voted for', title.name || title.title || title.id);
  };

  const createParty = (title) => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    const party = {
      roomId,
      title: title?.name || title?.title || 'Watch Party',
      mediaId: title?.id || '',
      type: title?.type || 'movie',
      host: member.name,
      createdAt: Date.now(),
      members: [member.name],
      status: 'Lobby open',
    };
    setParties((current) => [party, ...current].slice(0, 12));
    addActivity('created a watch party for', party.title);
    return party;
  };

  const updateParty = (roomId, patch) => {
    setParties((current) => current.map((party) => (
      party.roomId === roomId ? { ...party, ...patch } : party
    )));
  };

  const value = {
    member,
    profile,
    setProfile,
    picks,
    setPicks,
    activity,
    addActivity,
    adminSettings,
    setAdminSettings,
    parties,
    voteForTitle,
    createParty,
    updateParty,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}
