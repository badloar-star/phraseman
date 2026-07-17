import { FieldPath, type Firestore, type Query, type Transaction } from 'firebase-admin/firestore';
import type { AgentManagerDocument, AgentManagerQuery, AgentManagerRepository, AgentManagerTransaction } from './ledger';

function document(snapshot: FirebaseFirestore.DocumentSnapshot): AgentManagerDocument | null {
  return snapshot.exists ? Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} }) : null;
}

export class FirestoreAgentManagerRepository implements AgentManagerRepository {
  constructor(private readonly firestore: Firestore) {}
  async get(path: string): Promise<AgentManagerDocument | null> { return document(await this.firestore.doc(path).get()); }
  async query(input: AgentManagerQuery): Promise<readonly AgentManagerDocument[]> {
    const query: Query = this.firestore.collection(input.collection)
      .orderBy(input.orderBy, 'desc').orderBy(FieldPath.documentId(), 'desc').limit(input.limit);
    const snapshot = await query.get();
    return Object.freeze(snapshot.docs.map((item) => Object.freeze({ id: item.id, data: item.data() })));
  }
  async runTransaction<T>(body: (transaction: AgentManagerTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(async (firestoreTransaction: Transaction) => body({
      get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
      create: (path, data) => { firestoreTransaction.create(this.firestore.doc(path), data); },
      update: (path, data) => { firestoreTransaction.update(this.firestore.doc(path), data); },
    }));
  }
}
