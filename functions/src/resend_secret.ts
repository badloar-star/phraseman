import { defineSecret } from 'firebase-functions/params';

/** Canonical Secret Manager parameter shared by every Resend consumer. */
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
