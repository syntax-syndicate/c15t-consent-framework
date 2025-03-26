import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import { status } from './status';
import { verifyConsent } from './verify-consent';
export * from './error';
export * from './ok';

export const baseEndpoints = {
	setConsent,
	showConsentBanner,
	status,
	verifyConsent,
};
