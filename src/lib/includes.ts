import { PUBLIC_USER_SELECT } from "./auth";

const user = { select: PUBLIC_USER_SELECT };

export const calendarInclude = {
  members: { include: { user } },
  labels: { orderBy: { orderIndex: "asc" as const } },
};

export const eventInclude = {
  label: true,
  creator: user,
  calendar: { select: { id: true, name: true, color: true } },
  participants: { include: { user } },
  attachments: true,
  comments: { include: { user }, orderBy: { createdAt: "asc" as const } },
  _count: { select: { comments: true } },
};
