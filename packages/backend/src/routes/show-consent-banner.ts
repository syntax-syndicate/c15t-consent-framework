
import { z } from 'zod';
import { pub } from './index';

export interface ShowConsentBannerResponse {
	showConsentBanner: boolean;
	jurisdiction: {
		code: string;
		message: string;
	};
	location: {
		countryCode: string | null;
		regionCode: string | null;
	};
}

export const showConsentBannerHandler = pub
	.route({
		path: '/show-consent-banner',
		method: 'GET',
	})
	.output(
		z.object({
			showConsentBanner: z.boolean(),
			jurisdiction: z.object({
				code: z.string(),
				message: z.string(),
			}),
			location: z.object({
				countryCode: z.string().nullable(),
				regionCode: z.string().nullable(),
			}),
		})
	)
	.handler(async ({ context }) => {
		// In oRPC we'd get headers from context instead of req
		// This would require context adjustment in the server setup
		const countryCode = context.headers?.['cf-ipcountry'] || 
			context.headers?.['x-vercel-ip-country'] || 
			context.headers?.['x-amz-cf-ipcountry'] || 
			context.headers?.['x-country-code'] || null;

		const regionCode = context.headers?.['x-vercel-ip-country-region'] || 
			context.headers?.['x-region-code'] || null;

		const { showConsentBanner, jurisdictionCode, message } = checkJurisdiction(
			typeof countryCode === 'string' ? countryCode : null
		);

		return {
			showConsentBanner,
			jurisdiction: {
				code: jurisdictionCode,
				message,
			},
			location: { 
				countryCode: typeof countryCode === 'string' ? countryCode : null, 
				regionCode: typeof regionCode === 'string' ? regionCode : null
			},
		};
	});

function checkJurisdiction(countryCode: string | null) {
	const jurisdictions = {
		EU: new Set([
			'AT',
			'BE',
			'BG',
			'HR',
			'CY',
			'CZ',
			'DK',
			'EE',
			'FI',
			'FR',
			'DE',
			'GR',
			'HU',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MT',
			'NL',
			'PL',
			'PT',
			'RO',
			'SK',
			'SI',
			'ES',
			'SE',
		]),
		EEA: new Set(['IS', 'NO', 'LI']),
		UK: new Set(['GB']),
		CH: new Set(['CH']),
		BR: new Set(['BR']),
		CA: new Set(['CA']),
		AU: new Set(['AU']),
		JP: new Set(['JP']),
		KR: new Set(['KR']),
	};

	let showConsentBanner = false;
	let jurisdictionCode = 'NONE';
	let message = 'No specific requirements';

	if (countryCode) {
		if (
			jurisdictions.EU.has(countryCode) ||
			jurisdictions.EEA.has(countryCode) ||
			jurisdictions.UK.has(countryCode)
		) {
			showConsentBanner = true;
			jurisdictionCode = 'GDPR';
			message = 'GDPR or equivalent regulations require a cookie banner.';
		} else if (jurisdictions.CH.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'CH';
			message = 'Switzerland requires similar data protection measures.';
		} else if (jurisdictions.BR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'BR';
			message = "Brazil's LGPD requires consent for cookies.";
		} else if (jurisdictions.CA.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPEDA';
			message = 'PIPEDA requires consent for data collection.';
		} else if (jurisdictions.AU.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'AU';
			message =
				"Australia's Privacy Act mandates transparency about data collection.";
		} else if (jurisdictions.JP.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'APPI';
			message = "Japan's APPI requires consent for data collection.";
		} else if (jurisdictions.KR.has(countryCode)) {
			showConsentBanner = true;
			jurisdictionCode = 'PIPA';
			message = "South Korea's PIPA requires consent for data collection.";
		}
	}

	return {
		showConsentBanner,
		jurisdictionCode,
		message,
	};
}
