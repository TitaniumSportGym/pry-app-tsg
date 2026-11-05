import { getAvatarInitials, parseDate } from '@/features/admin/models/admin-format';
import { getMemberId } from '@/features/home/models/home';

/**
 * Socio = usuario con rol "cliente". El backend solo envía correo, verificación y fecha de alta:
 * no hay nombre ni membresía por socio, así que la tarjeta muestra lo que sí existe.
 */
export interface AdminMember {
  id: string;
  email: string;
  memberId: string;
  initials: string;
  verified: boolean;
  createdAt: Date | null;
}

export function parseAdminMembers(raw: unknown): AdminMember[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    const user = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') return [];
    if (user.role !== 'cliente') return [];
    const memberId = getMemberId(user.email) ?? user.email;

    return [
      {
        id: user.id,
        email: user.email,
        memberId,
        initials: getAvatarInitials(memberId),
        verified: user.isVerified === true,
        createdAt: parseDate(user.createdAt),
      },
    ];
  });
}

export function summarizeMembers(members: readonly AdminMember[]) {
  const verified = members.filter((member) => member.verified).length;
  return { total: members.length, verified, unverified: members.length - verified };
}

/** Los más recientes primero: son los que recepción suele buscar. */
export function sortMembersByNewest(members: readonly AdminMember[]) {
  return [...members].sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  );
}

export function searchMembers(members: readonly AdminMember[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return [...members];
  return members.filter(
    (member) =>
      member.email.toLowerCase().includes(text) || member.memberId.toLowerCase().includes(text),
  );
}
