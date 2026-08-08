import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type {
  AdminPlanDocument,
  AdminPlanQuery,
  AdminPlansRepository,
  AdminPlansTransaction,
} from './ledger';

function document(snapshot: FirebaseFirestore.DocumentSnapshot): AdminPlanDocument | null {
  return snapshot.exists
    ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} })
    : null;
}

export class FirestoreAdminPlansRepository implements AdminPlansRepository {
  constructor(private readonly firestore: Firestore) {}

  async get(path: string): Promise<AdminPlanDocument | null> {
    return document(await this.firestore.doc(path).get());
  }

  async query(input: AdminPlanQuery): Promise<readonly AdminPlanDocument[]> {
    const snapshot = await this.firestore.collection('admin_plans')
      .orderBy('createdAtMs', 'desc').limit(input.limit).get();
    return Object.freeze(snapshot.docs.map((item) =>
      Object.freeze({ id: item.id, data: item.data() })));
  }

  async runTransaction<T>(body: (transaction: AdminPlansTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(async (firestoreTransaction: Transaction) => body({
      get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
      create: (path, data) => {
        firestoreTransaction.create(this.firestore.doc(path), data);
      },
    }));
  }
}
