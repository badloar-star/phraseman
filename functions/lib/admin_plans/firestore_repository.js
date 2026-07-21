"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAdminPlansRepository = void 0;
function document(snapshot) {
    return snapshot.exists
        ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} })
        : null;
}
class FirestoreAdminPlansRepository {
    constructor(firestore) {
        this.firestore = firestore;
    }
    async get(path) {
        return document(await this.firestore.doc(path).get());
    }
    async query(input) {
        const snapshot = await this.firestore.collection('admin_plans')
            .orderBy('createdAtMs', 'desc').limit(input.limit).get();
        return Object.freeze(snapshot.docs.map((item) => Object.freeze({ id: item.id, data: item.data() })));
    }
    async runTransaction(body) {
        return this.firestore.runTransaction(async (firestoreTransaction) => body({
            get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
            create: (path, data) => {
                firestoreTransaction.create(this.firestore.doc(path), data);
            },
        }));
    }
}
exports.FirestoreAdminPlansRepository = FirestoreAdminPlansRepository;
//# sourceMappingURL=firestore_repository.js.map