// check-domains.js
const mongoose = require("mongoose");
const Domain = require("./models/domainSchema");

async function checkDomains() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      "mongodb+srv://happy2age_user:happy2age3000@happy2age.pbct5.mongodb.net/happy2age?retryWrites=true&w=majority"
    );
    console.log("✅ Connected to MongoDB successfully!");

    console.log("🔍 Fetching all Domain records...");
    const domains = await Domain.find({});
    console.log(`📊 Found ${domains.length} domains in database`);

    if (domains.length === 0) {
      console.log("❌ No domains found in database");
    } else {
      console.log("\n📋 Domain details:");
      domains.forEach((domain, index) => {
        console.log(`\n${index + 1}. Domain: "${domain.name}"`);
        console.log(`   ID: ${domain._id}`);
        console.log(`   Category: ${domain.category}`);
        console.log(
          `   Happiness Parameter: ${JSON.stringify(domain.happinessParameter)}`
        );
        console.log(
          `   Has happinessParameter: ${
            domain.happinessParameter ? "Yes" : "No"
          }`
        );
        console.log(`   Is array: ${Array.isArray(domain.happinessParameter)}`);
        console.log(
          `   Length: ${
            domain.happinessParameter ? domain.happinessParameter.length : 0
          }`
        );
      });
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDomains().catch((err) => {
  console.error(err);
  process.exit(1);
});
