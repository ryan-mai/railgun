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
                // sign into Firebase (anonymous) so auth.onAuthStateChanged is triggered and we can attach uid to the player doc
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
                // set localStorage and move to game
                try {
                    localStorage.setItem('playerLoggedIn', 'true');
                    localStorage.setItem('playerName', name);
                    // Persist score and rank so game.html can read them immediately after redirect
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
            // Call generateAnon and destructure the returned object
            const { name, password, score, rank, id } = await generateAnon();
            console.info('auth.anon-auth: generateAnon returned', { name, password, score, rank, id });
            try {
                const authInstance = (window && window.auth) || firebase.auth();
                await authInstance.signInAnonymously();
            } catch (e) {
                console.warn('Anonymous sign-in failed:', e);
            }
            // Persist useful values locally and navigate to the game
            try {
                localStorage.setItem('playerLoggedIn', 'true');
                localStorage.setItem('playerName', name);
                localStorage.setItem('playerPassword', password);
                localStorage.setItem('playerId', id);
                // Persist score and rank from generateAnon
                localStorage.setItem('playerScore', score);
                localStorage.setItem('playerRank', rank);
            } catch (e) { console.error('auth.anon-auth: localStorage write failed', e); }
            alert('[System] New Player Logged in | Username: ' + name + ' | Password: ' + password + ' | Score: ' + score + ' | Rank: ' + rank);
            setTimeout(() => { window.location.href = 'game.html'; }, 250);
        }, { once: true });
    }
});