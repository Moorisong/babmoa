const mongoose = require('mongoose');
require('dotenv').config();

async function deleteAllData() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'babmoa' });
        console.log('Connected to MongoDB');

        // 모든 컬렉션 조회
        const collections = await mongoose.connection.db.collections();
        console.log('Found collections:', collections.map(c => c.collectionName));

        if (collections.length === 0) {
            // 직접 컬렉션 삭제 시도
            const db = mongoose.connection.db;
            const collectionList = await db.listCollections().toArray();
            console.log('Collection list:', collectionList);

            for (const col of collectionList) {
                const result = await db.collection(col.name).deleteMany({});
                console.log(`Deleted ${result.deletedCount} from ${col.name}`);
            }
        } else {
            for (const collection of collections) {
                const count = await collection.countDocuments();
                console.log(`${collection.collectionName}: ${count} documents`);
                const result = await collection.deleteMany({});
                console.log(`Deleted ${result.deletedCount} documents from ${collection.collectionName}`);
            }
        }

        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteAllData();
