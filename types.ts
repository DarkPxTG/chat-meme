
export interface Gift {
  id: string;
  giftId: string;
  name: string;
  price: number;
  emoji: string;
  rarity: string;
  acquiredAt: number;
  fromUser?: string;
  isUpgraded?: boolean;
  upgradeTag?: number;
  animationUrl?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface ChatSnapshot {
  id: string;
  chatId: string;
  chatName: string;
  timestamp: number;
  messages: { sender: string; text: string; time: string }[];
  expiresAt: number;
}

export interface SystemAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  durationSeconds: number;
  createdAt: number;
  expiresAt: number;
  isGlobalLock?: boolean; 
}

export interface AdConfig {
  id: string;
  title: string;
  text: string;
  image?: string;
  link?: string;
  buttonText?: string;
  isActive: boolean;
  views: number;
  startTime?: number;
  endTime?: number;
  isScheduled?: boolean;
}

export interface StreamMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  isDonation: boolean;
  amount?: number;
  timestamp: number;
}

export interface LiveStream {
  isActive: boolean;
  title: string;
  viewersCount: number;
  startedAt: number;
  hostId: string;
  guestId?: string;
  guestName?: string;
  guestAvatar?: string;
  requests: { userId: string; username: string; avatar: string }[];
  messages: StreamMessage[];
  // New Admin Options
  isChatDisabled?: boolean;
  isAudioMuted?: boolean;
  isVideoHidden?: boolean;
}

export interface User {
  uid: string;
  numericId: number;
  username: string;
  displayName: string;
  bio?: string;
  birthDate?: string;
  phone?: string;
  password?: string;
  avatar?: string;
  typoloBalance: number;
  gifts: Gift[];
  joinedChannels: string[];
  archivedChats: string[];
  isAdmin: boolean;
  isBanned?: boolean;
  warnings?: number;
  isBot?: boolean; 
  botToken?: string; 
  webAppUrl?: string; 
  ownedBots?: string[]; 
  chatBackground?: string;
  chatBackgroundBlur?: boolean; // New: Blur preference
  isPremium?: boolean;
  premiumExpiry?: number;
  referredBy?: string;
  language?: string;
  themeMode?: 'snow' | 'autumn' | 'none';
  faceIdData?: string;
  faceDescriptor?: number[];
  presence: {
    isOnline: boolean;
    lastSeen: number;
    statusHidden: boolean;
  };
  sessions: Session[];
  blockedUsers: string[];
  contacts: string[];
  inviteLink: string;
  inviterUid?: string;
  referralCount: number;
  usernameChangeTimestamp?: number;
  privacy: {
    inactivityMonths: number;
    transferToId?: string;
    lastSeen: 'everybody' | 'contacts' | 'nobody';
    forwarding: 'everybody' | 'nobody';
  };
}

export interface Session {
  id: string;
  deviceName: string;
  os: string;
  ip?: string;
  lastActive: number;
  appVersion: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  audio?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file' | 'sticker';
  type: 'text' | 'voice' | 'system' | 'media';
  status: 'pending' | 'sent' | 'read' | 'failed';
  replyToId?: string;
  forwardedFromId?: string;
  isForwarded: boolean;
  forwardHidden?: boolean;
  timestamp: any;
  localTimestamp: number;
  seenBy: string[];
  isDeleted: boolean;
  editHistory: { text: string; time: number }[];
  reactions: Reaction[];
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Chat {
  id: string;
  name: string;
  status: string;
  avatar: string;
  type: 'private' | 'group' | 'channel';
  groupUsername?: string; // New: For deep linking (t.me/groupname)
  lastMessage?: string;
  lastMessageTime?: number;
  time?: string;
  unreadCount?: number;
  pinned?: boolean;
  slowModeSeconds?: number;
  adminIds?: string[]; 
  peerAvatar?: string;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  frames: StoryFrame[];
  seen: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface StoryFrame {
  id: string;
  title: string;
  description: string;
  image: string; // URL for image or video
  mediaType: 'image' | 'video'; // New field
  duration?: number; // Video duration in seconds
  color: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'rejected';
  timestamp: number;
  sdpOffer?: string; 
  sdpAnswer?: string; 
  callerCandidates?: string[]; 
  receiverCandidates?: string[]; 
}
