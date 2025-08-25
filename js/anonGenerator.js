async function generateAnon(){
    if (typeof localStorage !== 'undefined' && localStorage.getItem('playerLoggedIn') === 'true') {
        console.info('generateAnon: skipped because user logged in');
        return { name: localStorage.getItem('playerName') || 'Player', password: localStorage.getItem('playerPassword') || '', score: Number(localStorage.getItem('playerScore')) || 0, rank: Number(localStorage.getItem('playerRank')) || 0, id: localStorage.getItem('playerId') || null };
    }
    const db = firebase.firestore();

    const querySnapshot = await db.collection("Players").get();
    const rank = querySnapshot.size + 1;
    const score = 0;
    const name = `Player ${rank}`;
    const password = generatePass();

    const docRef = await db.collection("Players").add({ name, password, score, rank });
    return { name, password, score, rank, id: docRef.id };
}