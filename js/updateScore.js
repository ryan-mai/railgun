async function updateScore(uid, score) {
    try {
        const firestore = (typeof window !== 'undefined' && window.db) || (typeof db !== 'undefined' && db) || null;
        if (!firestore) throw new Error('Firestore (db) is not initialized. Make sure checkAuth.js runs before this script.');

        const uidToUse = (typeof uid === 'function') ? uid() : uid || (window && window.auth && window.auth.currentUser && window.auth.currentUser.uid) || localStorage.getItem('playerUid') || localStorage.getItem('playerId');
        if (!uidToUse) throw new Error('No user UID provided or available.');

        const docRef = firestore.collection('Players').doc(uidToUse);

        const updated = await firestore.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            const current = (snap.exists && typeof snap.data().score === 'number') ? snap.data().score : -Infinity;
            if (score > current) {
                tx.set(docRef, { score: score }, { merge: true });
                return true;
            }
            return false;
        });

        // If we updated the player's high score, recompute ranks for all players.
        if (updated) {
            console.info('updateScore: player score increased, recomputing ranks...');
            try {
                const snapshot = await firestore.collection('Players').orderBy('score', 'desc').get();
                console.debug('updateScore: fetched players for ranking, count=', snapshot.size);
                if (!snapshot.empty) {
                    const batch = firestore.batch();
                    let rank = 1;
                    const plannedUpdates = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        // Log the current doc state
                        console.debug('updateScore: player', { id: doc.id, score: data.score, rank: data.rank });
                        // Only update if rank differs to reduce writes
                        if (data.rank !== rank) {
                            plannedUpdates.push({ id: doc.id, from: data.rank, to: rank });
                            batch.update(doc.ref, { rank: rank });
                        }
                        rank++;
                    });
                    if (plannedUpdates.length === 0) {
                        console.info('updateScore: no rank changes required');
                    } else {
                        console.info('updateScore: committing rank updates', plannedUpdates);
                        await batch.commit();
                        console.info('updateScore: rank updates committed');
                    }
                } else {
                    console.info('updateScore: no players found when recomputing ranks');
                }
            } catch (rankErr) {
                console.error('updateScore: failed to recompute ranks', rankErr);
            }
        }

        return updated;
    } catch (e) {
        console.error('updateScore error:', e);
        return false;
    }
}