AFRAME.registerComponent('google-auth', {
    init: function() {
        this.el.addEventListener('click', async (e) => {
            if (window.__authProcessStarted) {
                console.info('google-auth: auth already in progress, ignoring extra click');
                return;
            }
            window.__authProcessStarted = true;
            try {
                const authInstance = (window && window.auth) || firebase.auth();
                const firestore = (window && window.db) || firebase.firestore();
                const provider = new firebase.auth.GoogleAuthProvider();

                const result = await authInstance.signInWithPopup(provider);
                const user = result.user;
                let playername = user.displayName || user.email || null;
                if (!playername) {
                    try {
                        playername = prompt('[System] Enter your playername:', 'Player');
                    } catch (e) {
                        playername = 'Player ' + Math.floor(Math.random() * 10000);
                    }
                }

                const querySnapshot = await firestore.collection('Players').get();
                let nameExists = false;
                querySnapshot.forEach(doc => {
                    if (doc.data().name === playername) nameExists = true;
                });

                if (nameExists) {
                    alert('User already exists!');
                    return;
                }

                const rank = querySnapshot.size + 1;
                const score = 0;

                // Use auth UID as document id so it's easy to link account -> player doc
                const playerDocRef = firestore.collection('Players').doc(user.uid);
                const existingDoc = await playerDocRef.get();
                if (existingDoc.exists) {
                    console.info('auth.google-auth: player doc already exists for uid, updating name/rank if needed', user.uid);
                    await playerDocRef.set({ name: playername, rank, score }, { merge: true });
                } else {
                    await playerDocRef.set({ uid: user.uid, name: playername, score, rank, lastUpdated: new Date().toISOString() });
                    console.info('auth.google-auth: created Players doc for uid', user.uid, { name: playername, score, rank });
                }

                try {
                    localStorage.setItem('playerLoggedIn', 'true');
                    localStorage.setItem('playerName', playername);
                    localStorage.setItem('playerScore', score);
                    localStorage.setItem('playerRank', rank);
                    localStorage.setItem('playerId', user.uid); // store auth uid as playerId
                } catch (e) { console.error('auth.google-auth: localStorage write failed', e); }

                alert('[System] New Player Logged in | Username: ' + playername + ' | Score: ' + score + ' | Rank: ' + rank);
                window.location.href = 'game.html';
            } catch (error) {
                const errorCode = error.code;
                const errorMessage = error.message;
                const email = error.customData?.email;
                const credential = firebase.auth.GoogleAuthProvider.credentialFromError(error);
                console.error('Google sign-in error', errorCode, errorMessage, email, credential);
            }
        }, { once: true });
    }
});

AFRAME.registerComponent('user-auth', {
    init: function(){
        this.el.addEventListener('click', async (e) => { 
            if (window.__authProcessStarted) {
                console.info('user-auth: auth already in progress, ignoring extra click');
                return;
            }
            window.__authProcessStarted = true;
            const firestore = (window && window.db) || firebase.firestore();
            const authInstance = (window && window.auth) || firebase.auth();
            var playername = document.querySelector('#userText').getAttribute('troika-text').value;
            if (playername.length > 0) {
                const name = playername;
                const password = generatePass();

                const querySnapshot = await firestore.collection("Players").get();
                let exists = false;
                querySnapshot.forEach(doc => {
                    if (doc.data().name === name) exists = true;
                });

                if (exists) {
                    alert('User already exists!');
                    return;
                }

                const rank = querySnapshot.size + 1;
                const score = 0;
                const docRef = await firestore.collection('Players').add({ name, password, score, rank, lastUpdated: new Date().toISOString() });
                console.info('auth.user-auth: created Players doc', { docId: docRef.id, name, score, rank });
                let anonUid = null;
                try {
                    const cred = await authInstance.signInAnonymously();
                    anonUid = cred && cred.user ? cred.user.uid : (authInstance.currentUser && authInstance.currentUser.uid);
                } catch (e) {
                    console.warn('Anonymous sign-in failed after user creation:', e);
                }
                if (anonUid) {
                    try {
                        await docRef.set({ uid: anonUid, lastUpdated: new Date().toISOString() }, { merge: true });
                        console.info('auth.user-auth: merged uid into Players doc', { docId: docRef.id, uid: anonUid });
                    } catch (mergeErr) {
                        console.warn('auth.user-auth: failed to merge uid into Players doc', mergeErr);
                    }
                }

                try {
                    localStorage.setItem('playerLoggedIn', 'true');
                    localStorage.setItem('playerName', name);

                    localStorage.setItem('playerScore', score);
                    localStorage.setItem('playerRank', rank);
                    localStorage.setItem('playerId', docRef.id);
                    if (anonUid) localStorage.setItem('playerUid', anonUid);
                } catch (e) { console.error('auth.user-auth: localStorage write failed', e); }
                alert('[System] New Player Logged in | Username: ' + name + ' | Password: ' + password + ' | Score: ' + score + ' | Rank: ' + rank);
                window.location.href = 'game.html';
            }
        });
    }
}, { once: true });

AFRAME.registerComponent('anon-auth', {
    init: function(){
        this.el.addEventListener('click', async (e) => { 
            if (window.__authProcessStarted || localStorage.getItem('playerLoggedIn') === 'true') {
                console.info('anon-auth: auth already in progress or player logged in, ignoring');
                return;
            }
            window.__authProcessStarted = true;
            console.debug('[anon-auth] click received; starting anonymous auth flow');
            const firestore = (window && window.db) || firebase.firestore();
            const authInstance = (window && window.auth) || firebase.auth();
            let uid = null;
            try {
                const cred = await authInstance.signInAnonymously();
                uid = cred && cred.user ? cred.user.uid : (authInstance.currentUser && authInstance.currentUser.uid);
                console.debug('[anon-auth] signed in anonymously', { uid });
            } catch (signErr) {
                console.error('[anon-auth] anonymous sign-in failed, aborting', signErr);
                alert('Anonymous sign-in failed. See console.');
                window.__authProcessStarted = false;
                return;
            }

            try {
                // Check if player doc already exists for this uid (should not, but avoid duplicates)
                const playerDocRef = firestore.collection('Players').doc(uid);
                const existing = await playerDocRef.get();
                let name, password, score, rank;
                if (existing.exists) {
                    const data = existing.data() || {};
                    console.warn('[anon-auth] player doc already existed for uid; reusing', { uid, data });
                    name = data.name || 'Player';
                    password = localStorage.getItem('playerPassword') || generatePass();
                    score = typeof data.score === 'number' ? data.score : 0;
                    rank = typeof data.rank === 'number' ? data.rank : 0;
                } else {
                    // Compute next rank: count players with rank > 0 to avoid including placeholder 0 entries.
                    const snapAll = await firestore.collection('Players').get();
                    let counted = 0;
                    snapAll.forEach(d => { const r = d.data().rank; if (typeof r === 'number' && r > 0) counted++; });
                    rank = counted + 1;
                    score = 0;
                    name = `Player ${rank}`;
                    password = generatePass();
                    await playerDocRef.set({ uid, name, password, score, rank, lastUpdated: new Date().toISOString() });
                    console.info('[anon-auth] created player doc', { uid, name, score, rank });
                }

                try {
                    const dupQuery = await firestore.collection('Players').where('name','==', name).get();
                    let dupIds = [];
                    dupQuery.forEach(doc => { const d = doc.data(); if (!d.uid || d.uid !== uid) dupIds.push(doc.id); });
                    if (dupIds.length) {
                        console.warn('[anon-auth] potential duplicate player docs detected (same name, different/no uid). Consider cleaning manually.', { name, dupIds });
                    }
                } catch (dupErr) {
                    console.debug('[anon-auth] duplicate detection failed (non-fatal)', dupErr);
                }

                try {
                    localStorage.setItem('playerLoggedIn', 'true');
                    localStorage.setItem('playerName', name);
                    localStorage.setItem('playerPassword', password);
                    localStorage.setItem('playerId', uid); // id = uid now
                    localStorage.setItem('playerUid', uid);
                    localStorage.setItem('playerScore', String(score));
                    localStorage.setItem('playerRank', String(rank));
                } catch (lsErr) { console.error('[anon-auth] localStorage write failed', lsErr); }
                alert('[System] New Player Logged in | Username: ' + name + ' | Password: ' + password + ' | Score: ' + score + ' | Rank: ' + rank);
                setTimeout(() => { window.location.href = 'game.html'; }, 250);
            } catch (flowErr) {
                console.error('[anon-auth] flow error', flowErr);
                alert('Anonymous auth flow failed. See console.');
                window.__authProcessStarted = false;
            }
        }, { once: true });
    }
});