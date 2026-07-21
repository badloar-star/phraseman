"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAgentOfficeRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
function document(snapshot) {
    if (!snapshot.exists)
        return null;
    return Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} });
}
class FirestoreAgentOfficeRepository {
    constructor(firestore) {
        this.firestore = firestore;
    }
    async get(path) {
        return document(await this.firestore.doc(path).get());
    }
    async query(input) {
        let query = this.firestore.collection(input.collection);
        if (input.caseId)
            query = query.where('caseId', '==', input.caseId);
        query = query.orderBy(input.orderBy, 'desc').orderBy(firestore_1.FieldPath.documentId(), 'desc');
        if (input.cursor)
            query = query.startAfter(input.cursor.value, input.cursor.id);
        const snapshot = await query.limit(input.limit).get();
        return Object.freeze(snapshot.docs.map((row) => Object.freeze({ id: row.id, data: row.data() })));
    }
    async runTransaction(body) {
        return this.firestore.runTransaction(async (firestoreTransaction) => {
            const transaction = {
                get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
                create: (path, data) => { firestoreTransaction.create(this.firestore.doc(path), data); },
                update: (path, data) => { firestoreTransaction.update(this.firestore.doc(path), data); },
                set: (path, data) => { firestoreTransaction.set(this.firestore.doc(path), data); },
            };
            return body(transaction);
        });
    }
}
exports.FirestoreAgentOfficeRepository = FirestoreAgentOfficeRepository;
//# sourceMappingURL=firestore_repository.js.map