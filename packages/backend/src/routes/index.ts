import { status } from './status';
import type { Route } from './types';
import { showConsentBanner } from './show-consent-banner';

export const routes: Route[] = [status, showConsentBanner];
