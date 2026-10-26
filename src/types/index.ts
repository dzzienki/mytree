export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  color?: string | null;
}

export interface LabelDto {
  id: string;
  calendarId: string;
  name: string;
  colorHex: string;
  orderIndex: number;
}

export interface CalendarMemberDto {
  id: string;
  calendarId: string;
  userId: string;
  role: string;
  user: UserDto;
}

export interface CalendarDto {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  coverImageUrl?: string | null;
  timezone: string;
  firstDayOfWeek: number;
  inviteCode: string;
  members: CalendarMemberDto[];
  labels: LabelDto[];
  _count?: {
    events: number;
    keepItems: number;
  };
}

export interface EventAttachmentDto {
  id: string;
  eventId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: string;
}

export interface EventCommentDto {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: UserDto;
}

export interface EventDto {
  id: string;
  calendarId: string;
  creatorId: string;
  labelId?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  recurrenceRule?: string | null;
  recurrenceParentId?: string | null;
  createdAt: string;
  updatedAt: string;
  label?: LabelDto | null;
  creator: UserDto;
  calendar?: {
    id: string;
    name: string;
    color: string;
  };
  participants: {
    id: string;
    userId: string;
    user: UserDto;
  }[];
  comments?: EventCommentDto[];
  attachments?: EventAttachmentDto[];
  _count?: {
    comments: number;
    attachments?: number;
  };
}

export interface KeepChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KeepItemDto {
  id: string;
  calendarId: string;
  creatorId: string;
  title: string;
  content?: string | null;
  isChecklist: boolean;
  isCompleted: boolean;
  color?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  creator: UserDto;
}

export interface ActivityLogDto {
  id: string;
  calendarId: string;
  userId: string;
  action: string;
  targetTitle: string;
  details?: string | null;
  createdAt: string;
  user: UserDto;
}
