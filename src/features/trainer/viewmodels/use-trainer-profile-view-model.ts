import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { toProfileDraft, validateProfile, type ProfileDraft } from '@/features/trainer/models/trainer-routine';
import { TRAINER_KEYS, trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { trainerRoutinesRepository } from '@/features/trainer/repositories/trainer-routines-repository';
import type { UploadState } from '@/features/trainer/viewmodels/use-routine-editor-view-model';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { pickImage, type PickedFile } from '@/services/media-picker';
import { isUploadCancelled } from '@/services/upload-client';
import { getApiErrorMessage } from '@/utils/api-error-message';

/** Pantalla 89 · Entrenador — Editar perfil (PUT /api/trainer/profile, foto opcional). */
export function useTrainerProfileViewModel() {
  const resource = useAuthorizedResource(trainerRepository.getProfile, { reloadOn: [TRAINER_KEYS.profile] });
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const controller = useRef<AbortController | null>(null);

  // El formulario se llena una sola vez con lo que tiene el servidor.
  if (!draft && resource.data) setDraft(toProfileDraft(resource.data));

  const errors = submitted && draft ? validateProfile(draft) : {};
  const close = () => (router.canGoBack() ? router.back() : router.replace('/trainer/account'));

  return {
    isLoading: resource.isLoading && !draft,
    errorMessage: resource.error && !draft ? getAccessErrorMessage(resource.error, 'No encontramos tu perfil.') : null,
    retry: resource.retry,
    draft,
    errors,
    email: resource.data?.email ?? '',
    photoUri: photo?.uri ?? (resource.data?.photoUrl || null),
    initials: (draft?.fullName || resource.data?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join(''),
    photoError,
    isSaving,
    saveError,
    upload,
    setField(field: keyof ProfileDraft, value: string) {
      const clean = field === 'experienceYears' ? value.replace(/\D/g, '').slice(0, 2) : field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
      setDraft((current) => (current ? { ...current, [field]: clean } : current));
    },
    async pickPhoto() {
      setPhotoError(null);
      const result = await pickImage([1, 1]);
      if (result.status === 'picked') setPhoto(result.file);
      else if (result.status === 'invalid') setPhotoError(result.message);
    },
    async save() {
      if (!draft || isSaving) return;
      setSubmitted(true);
      if (Object.keys(validateProfile(draft)).length > 0) return;
      setIsSaving(true);
      setSaveError(null);
      const abort = new AbortController();
      controller.current = abort;
      if (photo) setUpload({ label: 'Subiendo tu foto', fraction: 0, sizeLabel: photo.size ? `${(photo.size / (1024 * 1024)).toFixed(1)} MB` : null });
      try {
        await trainerRoutinesRepository.saveProfile(draft, photo, {
          signal: abort.signal,
          onProgress: (fraction) => setUpload((current) => (current ? { ...current, fraction } : current)),
        });
        close();
      } catch (error) {
        if (!isUploadCancelled(error)) setSaveError(getApiErrorMessage(error, 'No pudimos guardar tu perfil. Inténtalo de nuevo.'));
      } finally {
        controller.current = null;
        setUpload(null);
        setIsSaving(false);
      }
    },
    cancelUpload() {
      controller.current?.abort();
    },
    cancel: close,
  };
}
