import * as admin from 'firebase-admin';

admin.initializeApp();

const { adminExportReportDocuments } = require('./admin_reports_center') as typeof import('./admin_reports_center');

export { adminExportReportDocuments };
