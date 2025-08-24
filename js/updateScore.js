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

    // Rank recomputation moved to a Cloud Function in production for security.

        return updated;
    } catch (e) {
        console.error('updateScore error:', e);
        return false;
    }
}