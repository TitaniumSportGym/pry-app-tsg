import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { parseUserRole } from '@/features/authorization/models/user-role';
import { getLegalRoutes } from '@/features/legal/models/legal-area';
import {
  getTrainerPersonalProfile,
  rectifyTrainerPersonalProfile,
} from '@/features/privacy/api/personal-data-api';
import {
  personalDataRows,
  validateRectification,
  type RectificationDraft,
  type RectificationErrors,
} from '@/features/privacy/models/personal-data';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { shouldInvalidateSession } from '@/services/apiClient';
import { getCurrentUser } from '@/services/authService';
import { ApiError } from '@/types/auth';

/** Mounted only for an authenticated user; the view also remounts it when the account changes. */
export function usePrivacyCenterViewModel() {
  const { role, user, status, signOut } = useAuth();
  const routes = getLegalRoutes(role);
  const [draft, setDraft] = useState<RectificationDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RectificationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (status !== 'authenticated' || !user || !role) throw new ApiError('Authentication required.', 401);
    const account = await getCurrentUser();
    if (account.id !== user.id || parseUserRole(account.rol) !== role) {
      throw new ApiError('No se pudo verificar la identidad del perfil.', 502);
    }
    const trainer = role === 'entrenador' ? await getTrainerPersonalProfile(user.id) : null;
    return { account, trainer };
  }, [role, status, user]);
  const resource = useAuthorizedResource(load);

  async function save() {
    if (
      !draft || !user || role !== 'entrenador' || status !== 'authenticated' ||
      saveLock.current || !mounted.current
    ) return;
    const { values, errors } = validateRectification(draft);
    setFieldErrors(errors);
    setSaveError(null);
    setSaveMessage(null);
    if (Object.keys(errors).length) return;
    saveLock.current = true;
    setIsSaving(true);
    try {
      await rectifyTrainerPersonalProfile(user.id, values, () => mounted.current);
      if (!mounted.current) return;
      setDraft(null);
      setSaveMessage('El servidor confirmó la actualización de tu nombre y teléfono.');
      resource.retry();
    } catch (error) {
      if (!mounted.current) return;
      setSaveError(getAccessErrorMessage(error, 'La edición de estos datos no está disponible.'));
      if (error instanceof ApiError && !error.sessionInvalidationHandled && shouldInvalidateSession(error.status, error.data)) await signOut();
    } finally {
      saveLock.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }

  return {
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, 'Estos datos aún no están disponibles.') : null,
    rows: resource.data ? personalDataRows(resource.data.account) : [],
    trainer: resource.data?.trainer,
    draft,
    fieldErrors,
    saveError,
    saveMessage,
    isSaving,
    save,
    beginEdit() {
      if (!resource.data?.trainer || resource.error) return;
      const { fullName, phone } = resource.data.trainer;
      setDraft({ fullName, phone });
      setSaveMessage(null);
      setSaveError(null);
      setFieldErrors({});
    },
    setField(field: keyof RectificationDraft, value: string) {
      setDraft((current) => current ? { ...current, [field]: value } : null);
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setSaveMessage(null);
    },
    cancelEdit() {
      if (saveLock.current) return;
      setDraft(null);
      setSaveError(null);
      setFieldErrors({});
    },
    retry: resource.retry,
    refresh() {
      if (draft || saveLock.current) return;
      setSaveMessage(null);
      resource.refresh();
    },
    openNotice() { router.push(routes.privacy); },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(routes.parent);
    },
  };
}
