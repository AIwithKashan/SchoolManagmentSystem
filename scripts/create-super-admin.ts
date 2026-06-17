import { db } from "../lib/db";
import { hashSync } from "bcryptjs";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  rl.question("Enter password for Super Admin (admin@edumind.ai): ", async (password) => {
    if (!password || password.trim().length < 6) {
      console.error("Password must be at least 6 characters long.");
      rl.close();
      process.exit(1);
    }

    try {
      const hashedPassword = hashSync(password.trim(), 10);
      
      const existingUser = await db.user.findFirst({
        where: { email: "admin@edumind.ai" },
      });

      if (existingUser) {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            role: "SUPER_ADMIN",
          },
        });
        console.log("Super Admin account updated successfully!");
      } else {
        await db.user.create({
          data: {
            name: "Super Admin",
            email: "admin@edumind.ai",
            password: hashedPassword,
            role: "SUPER_ADMIN",
          },
        });
        console.log("Super Admin account created successfully!");
      }
    } catch (error) {
      console.error("Error creating Super Admin account:", error);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

main();
