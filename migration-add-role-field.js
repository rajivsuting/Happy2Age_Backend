const mongoose = require("mongoose");
require("dotenv/config");

const AdminSchema = require("./models/Admin");

async function migrateRoleField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all existing admins
    const admins = await AdminSchema.find({});
    console.log(`Found ${admins.length} existing admins`);

    // Update all existing admins to have 'admin' role (default)
    const result = await AdminSchema.updateMany(
      { role: { $exists: false } },
      { $set: { role: "admin" } }
    );

    console.log(`Updated ${result.modifiedCount} admins with default role`);

    // Set the first admin as super_admin if no super_admin exists
    const superAdminCount = await AdminSchema.countDocuments({
      role: "super_admin",
    });

    if (superAdminCount === 0 && admins.length > 0) {
      const firstAdmin = admins[0];
      await AdminSchema.findByIdAndUpdate(firstAdmin._id, {
        role: "super_admin",
      });
      console.log(`Set ${firstAdmin.email} as super_admin`);
    }

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateRoleField();
