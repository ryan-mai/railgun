const functions = require('firebase-functions');
const admin = require('firebase-admin');
try { admin.initializeApp(); } catch (e) {}
const db = admin.firestore();

exports.recomputeRanksOnScore = functions.firestore
  .document('Players/{playerId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null; // deletion ignored
    if (before && typeof before.score === 'number' && typeof after.score === 'number' && after.score <= before.score) return null;
    try {
      const snapshot = await db.collection('Players').orderBy('score', 'desc').get();
      let batch = db.batch();
      let rank = 1;
      let ops = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.rank !== rank) { batch.update(doc.ref, { rank }); ops++; }
        rank++;
      });
      if (ops > 0) { await batch.commit(); console.log('recomputeRanksOnScore: updated ranks for', ops, 'players'); }
      else { console.log('recomputeRanksOnScore: no rank changes'); }
    } catch (err) { console.error('recomputeRanksOnScore failed', err); }
    return null;
  });
