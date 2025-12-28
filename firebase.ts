
import { User, Chat, Message, Story, AdConfig, CallSession, LiveStream, StreamMessage, Report, SystemAlert, ChatSnapshot } from './types';
import { INITIAL_CHATS, MOCK_STORIES } from './constants';

const DB_NAME = 'UltimateMessenger_V3_Seasons'; 
const DB_VERSION = 7; // Incrementing for new store

const STORES = {
  USERS: 'users',
  CHATS: 'chats',
  MESSAGES: 'messages',
  STORIES: 'stories',
  ADS: 'ads',
  CALLS: 'calls',
  STREAM: 'stream', 
  REPORTS: 'reports',
  ALERTS: 'alerts',
  SNAPSHOTS: 'snapshots' // New Store
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.USERS)) db.createObjectStore(STORES.USERS, { keyPath: 'uid' });
      if (!db.objectStoreNames.contains(STORES.CHATS)) db.createObjectStore(STORES.CHATS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.STORIES)) db.createObjectStore(STORES.STORIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.ADS)) db.createObjectStore(STORES.ADS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.CALLS)) db.createObjectStore(STORES.CALLS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.STREAM)) db.createObjectStore(STORES.STREAM, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.REPORTS)) db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.ALERTS)) db.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbOp = async (storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest | void) => {
  const db = await openDB();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    tx.oncomplete = () => { db.close(); if (request && 'result' in request) resolve(request.result); else resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    if (request) { request.onsuccess = () => {}; }
  });
};

const triggerUpdate = () => { window.dispatchEvent(new Event('server-update')); };

export const auth = {
  currentUser: null as User | null,
  onAuthStateChanged: (cb: (user: User | null) => void) => {
    const activeUid = localStorage.getItem('active_account_uid');
    const loadUser = async () => {
        if(activeUid) {
            const user = await db.users.get(activeUid);
            if (user && user.isPremium && user.premiumExpiry && user.premiumExpiry < Date.now()) {
                await db.users.update(user.uid, { isPremium: false, premiumExpiry: undefined });
                user.isPremium = false;
            }
            auth.currentUser = user || null;
        } else { auth.currentUser = null; }
        cb(auth.currentUser);
    };
    loadUser();
    const checkSession = () => loadUser();
    window.addEventListener('auth-change', checkSession);
    return () => window.removeEventListener('auth-change', checkSession);
  },
  login: (user: User) => {
      const accountsStr = localStorage.getItem('accounts_list');
      let accounts: string[] = accountsStr ? JSON.parse(accountsStr) : [];
      if(!accounts.includes(user.uid)) {
          if (accounts.length >= 3) return alert("Maximum 3 accounts allowed.");
          accounts.push(user.uid);
          localStorage.setItem('accounts_list', JSON.stringify(accounts));
      }
      localStorage.setItem('active_account_uid', user.uid);
      auth.currentUser = user;
      window.dispatchEvent(new Event('auth-change'));
  },
  switchAccount: (uid: string) => {
      localStorage.setItem('active_account_uid', uid);
      window.dispatchEvent(new Event('auth-change'));
  },
  getAccounts: async (): Promise<User[]> => {
      const accountsStr = localStorage.getItem('accounts_list');
      const uids: string[] = accountsStr ? JSON.parse(accountsStr) : [];
      const users = [];
      for(const uid of uids) { const u = await db.users.get(uid); if(u) users.push(u); }
      return users;
  },
  logout: () => {
      localStorage.removeItem('active_account_uid');
      auth.currentUser = null;
      window.dispatchEvent(new Event('auth-change'));
  }
};

export const signOut = () => { auth.logout(); };

export const db = {
  users: {
    async create(user: User) { 
        if (user.inviterUid) {
            const inviter = await dbOp(STORES.USERS, 'readonly', store => store.get(user.inviterUid));
            if (inviter) {
                const newBal = (inviter.typoloBalance || 0) + 100;
                const newCount = (inviter.referralCount || 0) + 1;
                await db.users.update(inviter.uid, { typoloBalance: newBal, referralCount: newCount });
                user.typoloBalance = (user.typoloBalance || 0) + 100;
                user.referredBy = inviter.uid;
            }
        }
        await dbOp(STORES.USERS, 'readwrite', store => store.put(user)); 
        return user; 
    },
    async get(uid: string) { return await dbOp(STORES.USERS, 'readonly', store => store.get(uid)); },
    async getAll() { return await dbOp(STORES.USERS, 'readonly', store => store.getAll()); },
    async search(queryStr: string) {
      const users: User[] = await dbOp(STORES.USERS, 'readonly', store => store.getAll());
      if (!queryStr) return users;
      const q = queryStr.replace(/@/g, '').toLowerCase().trim();
      return users.filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q));
    },
    async update(uid: string, data: Partial<User>) {
      const user = await dbOp(STORES.USERS, 'readonly', store => store.get(uid));
      if (user) { const updated = { ...user, ...data }; await dbOp(STORES.USERS, 'readwrite', store => store.put(updated)); if (auth.currentUser?.uid === uid) auth.currentUser = updated; triggerUpdate(); }
    },
    async heartbeat(uid: string) { const user = await dbOp(STORES.USERS, 'readonly', store => store.get(uid)); if (user) { user.presence = { ...user.presence, isOnline: true, lastSeen: Date.now() }; await dbOp(STORES.USERS, 'readwrite', store => store.put(user)); triggerUpdate(); } },
    async addBalance(uid: string, amount: number) {
        const user = await dbOp(STORES.USERS, 'readonly', store => store.get(uid));
        if (user) {
            const newBal = (user.typoloBalance || 0) + amount;
            await db.users.update(uid, { typoloBalance: newBal });
        }
    }
  },
  chats: {
    async getMyChats(uid: string) {
      let allChats: Chat[] = await dbOp(STORES.CHATS, 'readonly', store => store.getAll());
      if (allChats.length === 0) { for (const c of INITIAL_CHATS) await dbOp(STORES.CHATS, 'readwrite', s => s.put(c)); allChats = INITIAL_CHATS; }
      return allChats.filter((c: Chat) => { if (c.type === 'channel') return true; if (c.type === 'group' && c.adminIds?.includes(uid)) return true; if (c.type === 'private' && c.id.includes(uid)) return true; return false; }).sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    },
    async getByGroupUsername(username: string) {
        let allChats: Chat[] = await dbOp(STORES.CHATS, 'readonly', store => store.getAll());
        return allChats.find(c => c.groupUsername && c.groupUsername.toLowerCase() === username.toLowerCase());
    },
    async create(chat: Chat) { await dbOp(STORES.CHATS, 'readwrite', store => store.put(chat)); triggerUpdate(); },
    async update(chatId: string, data: Partial<Chat>) { const chat = await dbOp(STORES.CHATS, 'readonly', store => store.get(chatId)); if (chat) { await dbOp(STORES.CHATS, 'readwrite', store => store.put({ ...chat, ...data })); triggerUpdate(); } },
    async delete(chatId: string) { await dbOp(STORES.CHATS, 'readwrite', store => store.delete(chatId)); triggerUpdate(); }
  },
  messages: {
    async send(chatId: string, message: Message) {
      await dbOp(STORES.MESSAGES, 'readwrite', store => store.put({ ...message, chatId }));
      const chat = await dbOp(STORES.CHATS, 'readonly', store => store.get(chatId));
      let previewText = 'Media';
      if (message.text) previewText = message.text; else if (message.type === 'voice') previewText = 'Voice Message'; else if (message.mediaType === 'sticker') previewText = 'Sticker'; else if (message.mediaType) previewText = message.mediaType.charAt(0).toUpperCase() + message.mediaType.slice(1);
      if (chat) { chat.lastMessage = previewText; chat.lastMessageTime = message.localTimestamp; chat.time = 'Now'; await dbOp(STORES.CHATS, 'readwrite', store => store.put(chat)); } 
      else { const isPrivate = chatId.includes('_'); const newChat: Chat = { id: chatId, name: 'Chat', type: isPrivate ? 'private' : 'group', status: 'Active', avatar: '', lastMessage: previewText, lastMessageTime: message.localTimestamp, unreadCount: 1, time: 'Now' }; await dbOp(STORES.CHATS, 'readwrite', store => store.put(newChat)); }
      triggerUpdate();
    },
    async delete(id: string) { await dbOp(STORES.MESSAGES, 'readwrite', store => store.delete(id)); triggerUpdate(); },
    subscribe(chatId: string, cb: (msgs: Message[]) => void) {
      const handler = async () => { const allMsgs: (Message & { chatId: string })[] = await dbOp(STORES.MESSAGES, 'readonly', store => store.getAll()); const chatMsgs = allMsgs.filter(m => m.chatId === chatId).sort((a,b) => a.timestamp - b.timestamp); cb(chatMsgs); };
      window.addEventListener('server-update', handler); handler(); return () => window.removeEventListener('server-update', handler);
    }
  },
  stories: {
    get(viewerUid: string) { return dbOp(STORES.STORIES, 'readonly', store => store.getAll()).then((allStories: Story[]) => { if (allStories.length === 0) return MOCK_STORIES; return allStories; }); },
    async add(story: Story) { await dbOp(STORES.STORIES, 'readwrite', store => store.put(story)); triggerUpdate(); },
    async delete(id: string) { await dbOp(STORES.STORIES, 'readwrite', store => store.delete(id)); triggerUpdate(); }
  },
  calls: {
      async initiate(call: CallSession) { await dbOp(STORES.CALLS, 'readwrite', store => store.put(call)); triggerUpdate(); },
      async updateStatus(callId: string, status: 'connected' | 'ended' | 'rejected') { 
          const call = await dbOp(STORES.CALLS, 'readonly', store => store.get(callId)); 
          if(call) { call.status = status; await dbOp(STORES.CALLS, 'readwrite', store => store.put(call)); triggerUpdate(); } 
      },
      async setSDP(callId: string, type: 'offer' | 'answer', sdp: string) {
          const call = await dbOp(STORES.CALLS, 'readonly', store => store.get(callId));
          if(call) {
              if (type === 'offer') call.sdpOffer = sdp;
              else call.sdpAnswer = sdp;
              await dbOp(STORES.CALLS, 'readwrite', store => store.put(call));
              triggerUpdate();
          }
      },
      async addCandidate(callId: string, type: 'caller' | 'receiver', candidate: string) {
          const call = await dbOp(STORES.CALLS, 'readonly', store => store.get(callId));
          if(call) {
              if(type === 'caller') {
                  if(!call.callerCandidates) call.callerCandidates = [];
                  call.callerCandidates.push(candidate);
              } else {
                  if(!call.receiverCandidates) call.receiverCandidates = [];
                  call.receiverCandidates.push(candidate);
              }
              await dbOp(STORES.CALLS, 'readwrite', store => store.put(call));
              triggerUpdate();
          }
      },
      async getActiveCalls(userId: string) { const allCalls: CallSession[] = await dbOp(STORES.CALLS, 'readonly', store => store.getAll()); return allCalls.filter(c => (c.callerId === userId || c.receiverId === userId) && c.status !== 'ended' && c.status !== 'rejected'); }
  },
  stream: {
      async get() { return await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); },
      async start(title: string, hostId: string) { const stream: LiveStream = { isActive: true, title, viewersCount: 0, startedAt: Date.now(), hostId, requests: [], messages: [] }; await dbOp(STORES.STREAM, 'readwrite', store => store.put({ ...stream, id: 'global_stream' })); triggerUpdate(); },
      async stop() { await dbOp(STORES.STREAM, 'readwrite', store => store.delete('global_stream')); triggerUpdate(); },
      async update(data: Partial<LiveStream>) { const stream = await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); if (stream) { await dbOp(STORES.STREAM, 'readwrite', store => store.put({ ...stream, ...data, id: 'global_stream' })); triggerUpdate(); } },
      async addRequest(user: { userId: string, username: string, avatar: string }) { const stream: LiveStream = await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); if(stream && !stream.requests.find(r => r.userId === user.userId)) { stream.requests.push(user); await dbOp(STORES.STREAM, 'readwrite', store => store.put(stream)); triggerUpdate(); } },
      async removeRequest(userId: string) { const stream: LiveStream = await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); if(stream) { stream.requests = stream.requests.filter(r => r.userId !== userId); await dbOp(STORES.STREAM, 'readwrite', store => store.put(stream)); triggerUpdate(); } },
      async addMessage(msg: StreamMessage) { const stream: LiveStream = await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); if (stream) { stream.messages.push(msg); await dbOp(STORES.STREAM, 'readwrite', store => store.put(stream)); triggerUpdate(); } },
      async setGuest(guestId: string | undefined, guestName: string | undefined) { const stream = await dbOp(STORES.STREAM, 'readonly', store => store.get('global_stream')); if(stream) { stream.guestId = guestId; stream.guestName = guestName; await dbOp(STORES.STREAM, 'readwrite', store => store.put(stream)); triggerUpdate(); } }
  },
  reports: { async add(report: Report) { await dbOp(STORES.REPORTS, 'readwrite', store => store.put(report)); triggerUpdate(); }, async getAll() { return await dbOp(STORES.REPORTS, 'readonly', store => store.getAll()); } },
  ads: { 
      async set(ad: AdConfig) { await dbOp(STORES.ADS, 'readwrite', store => store.put(ad)); triggerUpdate(); }, 
      async getActive() { const ads: AdConfig[] = await dbOp(STORES.ADS, 'readonly', store => store.getAll()); return ads.find(a => a.isActive); },
      async getAll() { return await dbOp(STORES.ADS, 'readonly', store => store.getAll()); }
  },
  alerts: {
      async set(alert: SystemAlert) { await dbOp(STORES.ALERTS, 'readwrite', store => store.put(alert)); triggerUpdate(); },
      async getActive() { const alerts: SystemAlert[] = await dbOp(STORES.ALERTS, 'readonly', store => store.getAll()); return alerts.find(a => a.expiresAt > Date.now()); }
  },
  snapshots: {
      async add(snapshot: ChatSnapshot) { await dbOp(STORES.SNAPSHOTS, 'readwrite', store => store.put(snapshot)); },
      async getAll() { 
          const all: ChatSnapshot[] = await dbOp(STORES.SNAPSHOTS, 'readonly', store => store.getAll()); 
          // Auto Prune Expired
          const now = Date.now();
          const valid = all.filter(s => s.expiresAt > now);
          if (valid.length !== all.length) {
              // Delete expired in background
              all.filter(s => s.expiresAt <= now).forEach(async s => await dbOp(STORES.SNAPSHOTS, 'readwrite', store => store.delete(s.id)));
          }
          return valid.sort((a,b) => b.timestamp - a.timestamp);
      }
  }
};

(async function bootServer() { try { const users = await db.users.getAll(); if (!users.find((u: User) => u.username === 'admin')) { const admin: User = { uid: 'admin_official', numericId: 1, username: 'admin', displayName: 'System Admin', password: 'Password@123', typoloBalance: 999999, gifts: [], joinedChannels: [], archivedChats: [], isAdmin: true, presence: { isOnline: true, lastSeen: Date.now(), statusHidden: false }, sessions: [], blockedUsers: [], contacts: [], inviteLink: 'ultimate.app/admin', referralCount: 0, privacy: { inactivityMonths: 12, lastSeen: 'everybody', forwarding: 'everybody' } }; await db.users.create(admin); } } catch (e) { console.error("DB Boot Failed", e); } })();
