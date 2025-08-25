async function updateScore(uid, score) {
    try {
        const firestore = (typeof window !== 'undefined' && window.db) || (typeof db !== 'undefined' && db) || null;
        if (!firestore) throw new Error('Firestore (db) is not initialized. Make sure checkAuth.js runs before this script.');

        const uidToUse = (typeof uid === 'function') ? uid() : uid || (window && window.auth && window.auth.currentUser && window.auth.currentUser.uid) || localStorage.getItem('playerUid') || localStorage.getItem('playerId');
        if (!uidToUse) throw new Error('No user UID provided or available.');

        const docRef = firestore.collection('Players').doc(uidToUse);

        console.debug('[updateScore] invoked', { paramUid: uid, resolvedUid: uidToUse, newScoreAttempt: score });
        const updated = await firestore.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            const current = (snap.exists && typeof snap.data().score === 'number') ? snap.data().score : -Infinity;
            console.debug('[updateScore] transaction read', { docId: docRef.id, currentRemoteScore: current });

            const newScore = Number(score);
            if (!isNaN(newScore) && newScore > current) {
                tx.set(docRef, { score: newScore, lastUpdated: new Date().toISOString() }, { merge: true });
                console.debug('[updateScore] staging score update', { docId: docRef.id, newScore });

                return { updated: true, newScore };
            }

            return { updated: false, newScore: current };
        });

        if (updated && updated.updated) {
            try {
                const prevLocal = parseInt(localStorage.getItem('playerScore') || '0', 10);
                    if (updated.newScore > prevLocal) {
                    localStorage.setItem('playerScore', String(updated.newScore));

                }
            } catch (lsErr) {
                console.warn('updateScore: failed to sync localStorage', lsErr);
            }

            try {

                console.debug('[updateScore] starting client-side rank recomputation');
                const snapshot = await firestore.collection('Players').orderBy('score', 'desc').get();
                if (snapshot && snapshot.size > 0) {
                    const batch = firestore.batch();
                    let rank = 1;
                    let ops = 0;
                    let aboveScore = Number.POSITIVE_INFINITY;
                    let aboveDocId = null;
                    let aboveName = null;
                    snapshot.forEach(doc => {
                        const data = doc.data() || {};
                        const currentScore = (typeof data.score === 'number') ? data.score : -Infinity;
                        const isGreaterThanAbove = currentScore > aboveScore;
                        console.debug('[updateScore] rank pass', { rankCandidate: rank, docId: doc.id, name: data.name, score: currentScore, isGreaterThanAbove, aboveScore, aboveDocId });

                        if (data.rank !== rank) {

                            batch.update(doc.ref, { rank: rank, lastUpdated: new Date().toISOString() });
                            ops++;
                        }

                        aboveScore = currentScore;
                        aboveDocId = doc.id;
                        aboveName = data.name || null;
                        rank++;
                    });
                    if (ops > 0) {
                        try {
                            await batch.commit();
                            console.info('[updateScore] rank batch committed', { ops });
                        } catch (commitErr) {
                            console.error('[updateScore] failed to commit rank updates (permissions or network)', { err: commitErr, ops, snapshotSize: snapshot.size });
                        }
                    } else {
                        console.debug('[updateScore] no rank changes needed');
                    }
                }
            } catch (recompErr) {
                console.error('[updateScore] client-side rank recompute failed', recompErr);
            }
            return true;
        } else {
            console.debug('[updateScore] score unchanged; not updating localStorage');
            return false;
        }
    } catch (e) {
        console.error('updateScore error:', e);
        return false;
    }
}