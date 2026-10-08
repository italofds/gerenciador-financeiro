import type { Collection } from "mongodb";

// profile encrypted in the browser; the server never sees its contents
export type Blob = { v: 1; iv: string; data: string };
export type StoredProfile = {
  id: string;
  authSalt: string;
  authHash: string;
  blob: Blob;
  rev: number;
};

export interface ProfileStore {
  find(id: string): Promise<StoredProfile | null>;
  /** Resolves to false when the id is already taken. */
  create(profile: Omit<StoredProfile, "rev">): Promise<boolean>;
  /** Resolves to the new revision, or null when `rev` is no longer the current one. */
  update(id: string, rev: number, blob: Blob): Promise<number | null>;
}

export type ProfileDoc = Omit<StoredProfile, "id"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

const DUPLICATE_KEY = 11000;

export function mongoStore(col: Collection<ProfileDoc>): ProfileStore {
  return {
    async find(id) {
      const doc = await col.findOne({ _id: id });
      if (!doc) return null;
      const { _id, authSalt, authHash, blob, rev } = doc;
      return { id: _id, authSalt, authHash, blob, rev };
    },
    async create({ id, ...rest }) {
      const now = new Date();
      try {
        await col.insertOne({ _id: id, ...rest, rev: 1, createdAt: now, updatedAt: now });
        return true;
      } catch (err) {
        if ((err as { code?: number }).code === DUPLICATE_KEY) return false;
        throw err;
      }
    },
    async update(id, rev, blob) {
      const res = await col.updateOne(
        { _id: id, rev },
        { $set: { blob, updatedAt: new Date() }, $inc: { rev: 1 } },
      );
      return res.matchedCount === 1 ? rev + 1 : null;
    },
  };
}
