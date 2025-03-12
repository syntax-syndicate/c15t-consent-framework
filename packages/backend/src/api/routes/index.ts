import { setConsent } from './set-consent';
import { status } from './status';
import { showConsentBanner } from './show-consent-banner';

export * from './error';
export * from './ok';

export const baseEndpoints = {
	setConsent,
	showConsentBanner,
	status,
};
