/**
 * mergeField.js — Shared CRDT field-merge utility
 *
 * Extracted from sync.js so it can be imported by both:
 *   - sync.js          (server / LAN transport)
 *   - nearbySync.js    (Nearby Connections transport)
 *
 * The algorithm is transport-agnostic: it resolves concurrent edits
 * to the same field using device ID + timestamp, flagging true conflicts
 * where two different devices made different changes at different times.
 */

/**
 * Merge two CRDT field objects (local vs. incoming).
 *
 * Each field has the shape:
 *   { value, timestamp, updatedBy }          — normal value
 *   { conflict, versionA, versionB }         — unresolved conflict
 *
 * @param {object|null} localField
 * @param {object|null} incomingField
 * @returns {object} The merged field
 */
export function mergeField(localField, incomingField) {
  if (!localField) return incomingField;
  if (!incomingField) return localField;

  // Incoming already has an unresolved conflict
  if (incomingField.conflict && !localField.conflict) {
    const maxTs = Math.max(
      incomingField.versionA.timestamp,
      incomingField.versionB.timestamp
    );
    if (localField.timestamp > maxTs) return localField;
    return incomingField;
  }

  // Local has an unresolved conflict, incoming is clean
  if (!incomingField.conflict && localField.conflict) {
    const maxTs = Math.max(
      localField.versionA.timestamp,
      localField.versionB.timestamp
    );
    if (incomingField.timestamp > maxTs) return incomingField;
    return localField;
  }

  // Both have conflicts — local keeps its own conflict state
  if (incomingField.conflict && localField.conflict) {
    return localField;
  }

  // Both are normal values — detect true conflict
  const sameDevice = localField.updatedBy === incomingField.updatedBy;
  const sameTime   = localField.timestamp  === incomingField.timestamp;

  if (!sameDevice && !sameTime) {
    // Two different devices, different times → real conflict
    return {
      conflict: true,
      versionA: incomingField,
      versionB: localField,
    };
  }

  // Same device or identical timestamps → last-write-wins
  if (incomingField.timestamp > localField.timestamp) return incomingField;
  return localField;
}

/**
 * Merge two full report objects, field by field.
 * Returns the merged report with syncStatus set appropriately.
 *
 * @param {object} localReport
 * @param {object} incomingReport
 * @returns {object}
 */
export function mergeReport(localReport, incomingReport) {
  const FIELDS = ['injuredCount', 'notes', 'location', 'priority', 'volunteersRequired'];

  const merged = {
    reportId: localReport.reportId,
  };

  for (const field of FIELDS) {
    merged[field] = mergeField(localReport[field], incomingReport[field]);
  }

  const hasConflict = FIELDS.some(f => merged[f]?.conflict === true);
  merged.syncStatus = hasConflict ? 'conflict' : 'synced';

  return merged;
}
