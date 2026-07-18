"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAgentManagerRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
function document(snapshot) {
    return snapshot.exists ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} }) : null;
}
class FirestoreAgentManagerRepository {
    constructor(firestore) {
        this.firestore = firestore;
    }
    async get(path) { return document(await this.firestore.doc(path).get()); }
    async query(input) {
        const query = this.firestore.collection(input.collection)
            .orderBy(input.orderBy, 'desc').orderBy(firestore_1.FieldPath.documentId(), 'desc').limit(input.limit);
        const snapshot = await query.get();
        return Object.freeze(snapshot.docs.map((item) => Object.freeze({ id: item.id, data: item.data() })));
    }
    async runTransaction(body) {
        return this.firestore.runTransaction(async (firestoreTransaction) => body({
            get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
            create: (path, data) => { firestoreTransaction.create(this.firestore.doc(path), data); },
            update: (path, data) => { firestoreTransaction.update(this.firestore.doc(path), data); },
        }));
    }
}
exports.FirestoreAgentManagerRepository = FirestoreAgentManagerRepository;
//# sourceMappingURL=firestore_repository.js.map