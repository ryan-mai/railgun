async function getTopPlayers() {
    try {
    if (!db) {
    console.warn('[leaderboard] Firestore not available; skipping leaderboard fetch');
        return [];
    }
  console.debug('[leaderboard] fetching top players by rank ASC limit 3');
  const snapshot = await db.collection("Players")
    .orderBy("rank", "asc")
    .limit(3)
    .get();
  console.debug('[leaderboard] raw snapshot size', snapshot.size);

  let topPlayers = [];
  snapshot.forEach(doc => {
    const data = doc.data();
  console.debug('[leaderboard] doc', { id: doc.id, name: data.name, rank: data.rank, score: data.score });
    topPlayers.push(data);
  });
  console.info('[leaderboard] topPlayers computed', topPlayers);
  
  return topPlayers;
      } catch (e) {
    console.error("[leaderboard] Error fetching leaderboard:", e);
        return [];
      }
    }

document.addEventListener('first-hit', function() {
  const lb = document.querySelector("#leaderstats")
  if (typeof lb.setAttribute === 'function') lb.setAttribute('visible', false);
  if (lb.style) lb.style.display = 'none';
  // Also hide the on-screen tip when the game starts
  try {
    const tip = document.querySelector('#tip');
    if (tip) {
      console.debug('[leaderboard] hiding #tip due to first-hit');
      if (typeof tip.setAttribute === 'function') tip.setAttribute('visible', false);
      if (tip.style) tip.style.display = 'none';
    }
  } catch (e) { console.warn('[leaderboard] failed to hide #tip', e); }
}, { once: true });