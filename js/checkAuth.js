document.documentElement.classList.add('auth-pending');
// Make Firestore (and auth) accessible to other scripts that load after this file.
let db = null;
try {
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  db = firebase.firestore();
  console.debug('checkAuth init — firebase initialized, auth and firestore created', { hasAuth: !!auth, hasDb: !!db });
  // Expose globally so other scripts (e.g. updateScore.js) can use without re-init
  window.firebaseApp = app;
  window.auth = auth;
  window.db = db;
  try {
    db.settings({ experimentalForceLongPolling: true });
    console.log('Firestore: experimentalForceLongPolling enabled');
  } catch (settingsErr) {
    console.warn('Failed to apply Firestore settings', settingsErr);
  }
        auth.onAuthStateChanged((user) => {
          const sceneEl = document.querySelector('#scene');
          console.log('onAuthStateChanged -> user:', user);
          console.log('firebase.auth().currentUser:', firebase.auth().currentUser);
          console.log('localStorage before handling:', {
            playerLoggedIn: localStorage.getItem('playerLoggedIn'),
            playerName: localStorage.getItem('playerName'),
            playerRank: localStorage.getItem('playerRank'),
            playerScore: localStorage.getItem('playerScore'),
            playerId: localStorage.getItem('playerId'),
            playerUid: localStorage.getItem('playerUid')
          });
          if (!user) {
            console.log('No authenticated user detected — redirecting to login.html');
            try { localStorage.removeItem('playerLoggedIn'); } catch (e) {}
            window.location.href = 'login.html';
            return;
          }
          try {
            localStorage.setItem('playerLoggedIn', 'true');
            const locked = localStorage.getItem('playerNameLocked') === 'true';
            const providedName = user.displayName || user.email;
            if (!locked && providedName && !localStorage.getItem('playerName')) {
              localStorage.setItem('playerName', providedName);
            }
            localStorage.setItem('playerUid', user.uid);
          } catch (e) { console.error('checkAuth: localStorage set failed', e); }

          // Fetch authoritative player data (name, score, rank) from Players doc.
          (async () => {
            try {
              if (!db) return;
              const playerDocRef = db.collection('Players').doc(user.uid);
              const snap = await playerDocRef.get();
              if (snap.exists) {
                const data = snap.data();
                if (data) {
                  // Ensure we remember which document represents this player.
                  if (!localStorage.getItem('playerId')) {
                    localStorage.setItem('playerId', playerDocRef.id);
                  }
                  if (data.name) {
                    localStorage.setItem('playerName', data.name);
                    localStorage.setItem('playerNameLocked', 'true');
                  }
                  if (typeof data.score === 'number') {
                    localStorage.setItem('playerScore', data.score);
                  } else if (!localStorage.getItem('playerScore')) {
                    localStorage.setItem('playerScore', '0');
                  }
                  if (typeof data.rank === 'number') {
                    localStorage.setItem('playerRank', data.rank);
                  } else if (!localStorage.getItem('playerRank')) {
                    localStorage.setItem('playerRank', '0');
                  }
                  console.log('checkAuth: player doc synced', { name: data.name, score: data.score, rank: data.rank });
                }
              } else {
                // No doc with id = uid. Maybe it was created earlier with a random doc id (user-auth flow).
                // Search for an existing doc whose stored uid field matches the auth uid.
                const existingQuery = await db.collection('Players').where('uid','==',user.uid).limit(1).get();
                if (!existingQuery.empty) {
                  const found = existingQuery.docs[0];
                  const data = found.data() || {};
                  localStorage.setItem('playerId', found.id);
                  if (data.name) {
                    localStorage.setItem('playerName', data.name);
                    localStorage.setItem('playerNameLocked', 'true');
                  }
                  if (typeof data.score === 'number') {
                    localStorage.setItem('playerScore', data.score);
                  } else {
                    localStorage.setItem('playerScore', '0');
                  }
                  if (typeof data.rank === 'number') {
                    localStorage.setItem('playerRank', data.rank);
                  } else {
                    localStorage.setItem('playerRank', '0');
                  }
                  console.log('checkAuth: linked to pre-existing player doc by uid field', { docId: found.id });
                } else {
                  // Truly new: create doc with id = uid for normalization going forward.
                  const fallbackName = localStorage.getItem('playerName') || user.displayName || user.email || ('Player' + Math.floor(Math.random()*10000));
                  const initData = { uid: user.uid, name: fallbackName, score: 0, rank: 0, lastUpdated: new Date().toISOString() };
                  await playerDocRef.set(initData, { merge: true });
                  localStorage.setItem('playerId', playerDocRef.id);
                  localStorage.setItem('playerName', fallbackName);
                  localStorage.setItem('playerNameLocked', 'true');
                  localStorage.setItem('playerScore', '0');
                  localStorage.setItem('playerRank', '0');
                  console.log('checkAuth: created Players doc with fallback data', initData);
                }
              }
            } catch (syncErr) {
              console.warn('checkAuth: failed to sync player name from Firestore', syncErr);
            }
          })();
          console.log('Authenticated — stored player info:', {
            playerLoggedIn: localStorage.getItem('playerLoggedIn'),
            playerName: localStorage.getItem('playerName'),
            playerScore: localStorage.getItem('playerScore'),
            playerRank: localStorage.getItem('playerRank'),
            playerId: localStorage.getItem('playerId'),
            uid: user.uid
          });
          if (sceneEl) sceneEl.style.visibility = 'visible';
          document.documentElement.classList.remove('auth-pending');
        });
} catch (e) {
  console.warn('Firebase init failed or already initialized.', e);
  const sceneEl = document.querySelector('#scene');
  if (sceneEl) sceneEl.style.visibility = 'visible';
  document.documentElement.classList.remove('auth-pending');
}
