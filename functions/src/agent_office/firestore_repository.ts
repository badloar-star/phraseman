import { FieldPath, type Firestore, type Query, type Transaction } from 'firebase-admin/firestore';
import type {
  AgentOfficeDocument,
  AgentOfficeQuery,
  AgentOfficeRepository,
  AgentOfficeTransaction,
} from './ledger';

function document(snapshot: FirebaseFirestore.DocumentSnapshot): AgentOfficeDocument | null {
  if (!snapshot.exists) return null;
  return Object.freeze({ id: snapshot.id, data: snapshot.data() ?? {} });
}

export class FirestoreAgentOfficeRepository implements AgentOfficeRepository {
  constructor(private readonly firestore: Firestore) {}

  async get(path: string): Promise<AgentOfficeDocument | null> {
    return document(await this.firestore.doc(path).get());
  }

  async query(input: AgentOfficeQuery): Promise<readonly AgentOfficeDocument[]> {
    let query: Query = this.firestore.collection(input.collection);
    if (input.caseId) query = query.where('caseId', '==', input.caseId);
    query = query.orderBy(input.orderBy, 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (input.cursor) query = query.startAfter(input.cursor.value, input.cursor.id);
    const snapshot = await query.limit(input.limit).get();
    return Object.freeze(snapshot.docs.map((row) => Object.freeze({ id: row.id, data: row.data() })));
  }

  async runTransaction<T>(body: (transaction: AgentOfficeTransaction) => Promise<T>): Promise<T> {
    return this.firestore.runTransaction(async (firestoreTransaction: Transaction) => {
      const transaction: AgentOfficeTransaction = {
        get: async (path) => document(await firestoreTransaction.get(this.firestore.doc(path))),
        create: (path, data) => { firestoreTransaction.create(this.firestore.doc(path), data); },
        update: (path, data) => { firestoreTransaction.update(this.firestore.doc(path), data); },
        set: (path, data) => { firestoreTransaction.set(this.firestore.doc(path), data); },
      };
      return body(transaction);
    });
  }
}
