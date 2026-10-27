import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

import { getLegalRoutes, type LegalDocument } from '@/features/legal/models/legal-area';
import {
  getArcoMailUrl,
  LEGAL_CONTACT_EMAIL,
  PRIVACY,
  TERMS,
} from '@/features/legal/models/legal-content';
import { useAuth } from '@/hooks/use-auth';

export function useLegalViewModel(document: LegalDocument) {
  const { role } = useAuth();
  const routes = getLegalRoutes(role);

  return {
    document,
    terms: TERMS,
    privacy: PRIVACY,
    openPrivacy() {
      router.push(routes.privacy);
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(routes.parent);
    },
    async contactArco() {
      try {
        await Linking.openURL(getArcoMailUrl());
      } catch {
        Alert.alert(
          'No encontramos una app de correo',
          `Envía tu solicitud a ${LEGAL_CONTACT_EMAIL} con tu nombre, lo que solicitas y una copia de tu identificación.`,
        );
      }
    },
    openWebsite() {
      void WebBrowser.openBrowserAsync(
        document === 'terms' ? TERMS.websiteUrl : PRIVACY.websiteUrl,
      );
    },
  };
}
