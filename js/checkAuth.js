document.documentElement.classList.add('auth-pending');
console.debug('[checkAuth] script start');
let db = null;
try {
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  db = firebase.firestore();
  
  window.firebaseApp = app;
  window.auth = auth;
  window.db = db;
  try {
  db.settings({ experimentalForceLongPolling: true });
  } catch (settingsErr) {
    console.warn('Failed to apply Firestore settings', settingsErr);
  }
        auth.onAuthStateChanged((user) => {
          console.debug('[checkAuth] onAuthStateChanged', { hasUser: !!user, uid: user && user.uid });
          
          const sceneEl = document.querySelector('#scene');
          
          if (!user) {
            console.debug('[checkAuth] no user -> redirect to login');
            
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
            console.debug('[checkAuth] set basic localStorage values', { locked, providedName });
          } catch (e) { console.error('checkAuth: localStorage set failed', e); }

          (async () => {
            try {
              if (!db) return;
  const playerDocRef = db.collection('Players').doc(user.uid);
        try {
          playerDocRef.onSnapshot((docSnap) => {
            if (!docSnap || !docSnap.exists) return;
            const d = docSnap.data() || {};
            console.debug('[checkAuth] onSnapshot player doc', { id: docSnap.id, name: d.name, rank: d.rank, score: d.score });
            
            try {
              if (typeof d.rank === 'number') {
                const prev = localStorage.getItem('playerRank');
                if (String(d.rank) !== prev) {
                  localStorage.setItem('playerRank', String(d.rank));
                  console.debug('[checkAuth] rank updated from snapshot', { rank: d.rank });
                  
                }
              }
              if (typeof d.score === 'number') {
                const prevS = localStorage.getItem('playerScore');
                if (String(d.score) !== prevS) {
                  localStorage.setItem('playerScore', String(d.score));
                  console.debug('[checkAuth] score updated from snapshot', { score: d.score });
                  
                }
              }
            } catch (lsErr) { console.warn('checkAuth:onSnapshot localStorage sync failed', lsErr); }
          });
        } catch (snapErr) { console.warn('checkAuth: failed to attach onSnapshot listener for player doc', snapErr); }
              const snap = await playerDocRef.get();
              console.debug('[checkAuth] initial player doc get', { exists: snap.exists });
              if (snap.exists) {
                const data = snap.data();
        if (data) {
      console.debug('[checkAuth] initial player doc data', { name: data.name, rank: data.rank, score: data.score });
          
                  // Reconcile score: keep the higher of local vs remote to avoid overwriting a better local score (e.g. offline progress)
                  try {
                    const localScoreStr = localStorage.getItem('playerScore');
                    const localScore = (localScoreStr !== null) ? parseInt(localScoreStr, 10) : null;
                    const remoteScore = (typeof data.score === 'number') ? data.score : null;
                    // Decide direction of sync
                    if (typeof localScore === 'number' && !isNaN(localScore)) {
                      if (typeof remoteScore === 'number') {
                        if (localScore > remoteScore) {
                          // Push local higher score to Firestore
                          await playerDocRef.set({ score: localScore, lastUpdated: new Date().toISOString() }, { merge: true });
                          data.score = localScore; // reflect in data object for subsequent localStorage set below
                          
                        } else if (remoteScore > localScore) {
                          // Later we will overwrite local with remote below; log it for visibility
                          
                        }
                      } else {
                        // Remote missing/invalid but we have local; push local up
                        await playerDocRef.set({ score: localScore, lastUpdated: new Date().toISOString() }, { merge: true });
                        data.score = localScore;
                        
                      }
                    } else if (typeof remoteScore === 'number') {
                      // No valid local score but remote has one; we'll just pull it down below
                      
                    }
                  } catch (reconErr) {
                    console.warn('checkAuth: score reconciliation failed; falling back to remote -> local', reconErr);
                  }
                  if (!localStorage.getItem('playerId')) {
                    localStorage.setItem('playerId', playerDocRef.id);
                  }
                  if (data.name) {
                    localStorage.setItem('playerName', data.name);
                    console.debug('[checkAuth] playerName set + locked', { name: data.name });
                    localStorage.setItem('playerNameLocked', 'true');
                  }
                  if (typeof data.score === 'number') {
                    localStorage.setItem('playerScore', data.score);
                    console.debug('[checkAuth] playerScore set from get', { score: data.score });
                  } else if (!localStorage.getItem('playerScore')) {
                    localStorage.setItem('playerScore', '0');
                  }
                  if (typeof data.rank === 'number') {
                    localStorage.setItem('playerRank', data.rank);
                    console.debug('[checkAuth] playerRank set from get', { rank: data.rank });
                  } else if (!localStorage.getItem('playerRank')) {
                    localStorage.setItem('playerRank', '0');
                  }
                
                }
              } else {
                
                const existingQuery = await db.collection('Players').where('uid','==',user.uid).limit(1).get();
                console.debug('[checkAuth] player doc missing by id, searched by uid', { found: !existingQuery.empty });
                if (!existingQuery.empty) {
                  const found = existingQuery.docs[0];
                  const data = found.data() || {};
                  
                  // Same reconciliation logic when matching by uid
                  try {
                    const localScoreStr = localStorage.getItem('playerScore');
                    const localScore = (localScoreStr !== null) ? parseInt(localScoreStr, 10) : null;
                    const remoteScore = (typeof data.score === 'number') ? data.score : null;
                    if (typeof localScore === 'number' && !isNaN(localScore)) {
                      if (typeof remoteScore === 'number') {
                        if (localScore > remoteScore) {
                          await found.ref.set({ score: localScore, lastUpdated: new Date().toISOString() }, { merge: true });
                          data.score = localScore;
                          
                        } else if (remoteScore > localScore) {
                          
                        }
                      } else {
                        await found.ref.set({ score: localScore, lastUpdated: new Date().toISOString() }, { merge: true });
                        data.score = localScore;
                        
                      }
                    }
                  } catch (reconErr) {
                    console.warn('checkAuth: (uid link) score reconciliation failed', reconErr);
                  }
                  localStorage.setItem('playerId', found.id);
                  if (data.name) {
                    localStorage.setItem('playerName', data.name);
                    console.debug('[checkAuth] playerName set (uid link) + locked', { name: data.name });
                    localStorage.setItem('playerNameLocked', 'true');
                  }
                  if (typeof data.score === 'number') {
                    localStorage.setItem('playerScore', data.score);
                    console.debug('[checkAuth] playerScore set (uid link)', { score: data.score });
                  } else {
                    localStorage.setItem('playerScore', '0');
                  }
                   if (typeof data.rank === 'number') {
                    localStorage.setItem('playerRank', data.rank);
                    console.debug('[checkAuth] playerRank set (uid link)', { rank: data.rank });
                  } else {
                    localStorage.setItem('playerRank', '0');
                  }
                  
                } else {
                  
                  // Truly new: create doc with id = uid for normalization going forward.
                  const fallbackName = localStorage.getItem('playerName') || user.displayName || user.email || ('Player' + Math.floor(Math.random()*10000));
                  // If there is already a localScore (e.g. offline play before first sync) preserve it.
                  const localScoreStr = localStorage.getItem('playerScore');
                  const localScore = (localScoreStr !== null && !isNaN(parseInt(localScoreStr, 10))) ? parseInt(localScoreStr, 10) : 0;
                  const initData = { uid: user.uid, name: fallbackName, score: localScore, rank: 0, lastUpdated: new Date().toISOString() };
                  await playerDocRef.set(initData, { merge: true });
                  console.debug('[checkAuth] created new player doc with fallback name', initData);
                  localStorage.setItem('playerId', playerDocRef.id);
                  localStorage.setItem('playerName', fallbackName);
                  localStorage.setItem('playerNameLocked', 'true');
                  localStorage.setItem('playerScore', String(initData.score));
                  localStorage.setItem('playerRank', '0');
                  
                }
              }
            } catch (syncErr) {
              console.warn('checkAuth: failed to sync player name from Firestore', syncErr);
            }
          })();
          
          if (sceneEl) sceneEl.style.visibility = 'visible';
          document.documentElement.classList.remove('auth-pending');
        });
} catch (e) {
  console.warn('Firebase init failed or already initialized.', e);
  const sceneEl = document.querySelector('#scene');
  if (sceneEl) sceneEl.style.visibility = 'visible';
  document.documentElement.classList.remove('auth-pending');
}
