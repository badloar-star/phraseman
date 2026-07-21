"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreLocalRunnerRepository = void 0;
const JOBS = 'agent_manager_execution_jobs';
function document(snapshot) {
    return snapshot.exists ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} }) : null;
}
/** Firestore adapter deliberately exposes only code_prepare candidates to the local runner core. */
class FirestoreLocalRunnerRepository {
    constructor(firestore) {
        this.firestore = firestore;
    }
    async get(path) {
        return document(await this.firestore.doc(path).get());
    }
    async listQueuedCodePrepareJobs() {
        // One equality filter avoids a composite-index dependency. The core validates queued state again in its transaction.
        const snapshot = await this.firestore.collection(JOBS).where('scope', '==', 'code_prepare').limit(50).get();
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
exports.FirestoreLocalRunnerRepository = FirestoreLocalRunnerRepository;
//# sourceMappingURL=local_runner_firestore_repository.js.map