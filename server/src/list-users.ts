import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/bscamdd';
  await mongoose.connect(uri);
  const users = await mongoose.connection.db!
    .collection('user')
    .find({}, { projection: { email: 1, name: 1 } })
    .toArray();
  console.log(users.length === 0 ? 'No users found.' : JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}

main().catch(console.error);
