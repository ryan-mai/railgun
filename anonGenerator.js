async function generateAnon(){
    const db = firebase.firestore();

    const querySnapshot = await db.collection("Players").get();
    const rank = querySnapshot.size + 1;
    const score = 0;
    const name = `Player ${rank}`;
    const password = generatePass();

    const docRef = await db.collection("Players").add({ name, password, score, rank });
    // Return a single object so callers can destructure the values
    return { name, password, score, rank, id: docRef.id };
}
