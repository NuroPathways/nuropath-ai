/**
 * Firestore data layer — mirrors Base44 entity API
 * Usage: import { getCollection } from '@/lib/firestore';
 * const col = getCollection('Child');
 * await col.list()
 * await col.filter({ clinician_id: '...' })
 * await col.create({ ... })
 * await col.update(id, { ... })
 * await col.delete(id)
 * await col.get(id)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function mapDoc(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export function getCollection(collectionName) {
  const col = collection(db, collectionName);

  return {
    async get(id) {
      const snap = await getDoc(doc(db, collectionName, id));
      if (!snap.exists()) return null;
      return mapDoc(snap);
    },

    async list(sortField = "created_date", limitCount = 100) {
      const field = sortField.startsWith("-") ? sortField.slice(1) : sortField;
      const dir = sortField.startsWith("-") ? "desc" : "asc";
      const q = query(col, orderBy(field, dir), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(mapDoc);
    },

    async filter(filters = {}, sortField = "created_date", limitCount = 100) {
      const constraints = Object.entries(filters).map(([k, v]) => where(k, "==", v));
      const field = sortField.startsWith("-") ? sortField.slice(1) : sortField;
      const dir = sortField.startsWith("-") ? "desc" : "asc";
      const q = query(col, ...constraints, orderBy(field, dir), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(mapDoc);
    },

    async create(data) {
      const docRef = await addDoc(col, {
        ...data,
        created_date: serverTimestamp(),
        updated_date: serverTimestamp(),
      });
      const snap = await getDoc(docRef);
      return mapDoc(snap);
    },

    async update(id, data) {
      const ref = doc(db, collectionName, id);
      await updateDoc(ref, { ...data, updated_date: serverTimestamp() });
      const snap = await getDoc(ref);
      return mapDoc(snap);
    },

    async delete(id) {
      await deleteDoc(doc(db, collectionName, id));
    },

    async bulkCreate(items) {
      return Promise.all(items.map((item) => this.create(item)));
    },
  };
}

// Pre-built collection accessors matching current entity names
export const Collections = {
  Child: getCollection("Child"),
  Family: getCollection("Family"),
  BehaviorPlan: getCollection("BehaviorPlan"),
  BehaviorLog: getCollection("BehaviorLog"),
  AIConversation: getCollection("AIConversation"),
  InterventionPlan: getCollection("InterventionPlan"),
  Document: getCollection("Document"),
  Message: getCollection("Message"),
  RewardToken: getCollection("RewardToken"),
  User: getCollection("User"),
};