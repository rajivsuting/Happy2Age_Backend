// test-connection.js
const mongoose = require("mongoose");

async function testConnection() {
  try {
    console.log("🔄 Testing MongoDB connection...");

    // Set a timeout for the connection
    const connectionPromise = mongoose.connect(
      "mongodb+srv://happy2age_user:happy2age3000@happy2age.pbct5.mongodb.net/happy2age?retryWrites=true&w=majority",
      {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // 45 second timeout
      }
    );

    // Add a timeout to the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout")), 10000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    console.log("✅ Connected to MongoDB successfully!");

    // Test if we can list collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log("📋 Available collections:");
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
