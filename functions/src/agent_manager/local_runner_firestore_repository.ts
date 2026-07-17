import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { LocalRunnerDocument, LocalRunnerRepository, LocalRunnerTransaction } from './local_runner_transport';

const JOBS = 'agent_manager_execution_jobs';

function document(snapshot: FirebaseFirestore.DocumentSnapshot): LocalRunnerDocument | null {
  return snapshot.exists ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} }) : null;
}

/** Firestore adapter deliberately exposes only code_prepare candidates to the local runner core. */
export class FirestoreLocalRunnerRepository implements LocalRunnerRepository {
  constructor(private readonly firestore: Firestore) {}

  async get(path: string): Promise<LocalRunnerDocument | null> {
    return document(await this.firestore.doc(path).get());
  }

  async listQueuedCodePrepareJobs(): Promise<readonly LocalRunnerDocument[]> {
    // One equality filter avoids a composite-index dependency. The core validates queued state again in its transaction.
    const snapshot = await this.firestore.collection(JOBS).where('scope', '==', 'code_prepare').limit(50).get();
    return Object.freeze(snapshot.docs.map((item) => Object.freeze({ id: item.id, data: item.data() })));
  }

  async runTransaction<T>(body: (transaction: LocalRunnerTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(async (firestoreTransaction: Transaction) => body({
      get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
      create: (path, data) => { firestoreTransaction.create(this.firestore.doc(path), data); },
      update: (path, data) => { firestoreTransaction.update(this.firestore.doc(path), data); },
    }));
  }
}
