async function getTopPlayers() {
    try {
    if (!db) {
        console.warn('Firestore not available; skipping leaderboard fetch');
        return [];
    }
    const snapshot = await db.collection("Players")
        .orderBy("rank", "asc")
        .limit(3)
        .get();

  let topPlayers = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    console.debug('leaderboard doc', { id: doc.id, data });
    topPlayers.push(data);
  });

  console.log("Top 3 players:", topPlayers);
  return topPlayers;
      } catch (e) {
        console.error("Error fetching leaderboard:", e);
        return [];
      }
    }

document.addEventListener('first-hit', function() {
  const lb = document.querySelector("#leaderstats")
  if (typeof lb.setAttribute === 'function') lb.setAttribute('visible', false);
  if (lb.style) lb.style.display = 'none';
}, { once: true });