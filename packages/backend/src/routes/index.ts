import { status } from './status';
import type { Route } from './types';
import { showConsentBanner } from './show-consent-banner';
import { setConsent } from './set-consent';
import { verifyConsent } from './verify-consent';

export const routes: Route[] = [
	status,
	showConsentBanner,
	setConsent,
	verifyConsent,
];
