import { promises as fs } from "fs";
import { join } from "path";
import pg from "pg";

const { Pool } = pg;

export async function initializeDatabase(pool: pg.Pool) {
  console.log("Initializing database...");
  
  let client;
  try {
    // Get a client from the pool
    client = await pool.connect();
    
    // Test the connection
    await client.query("SELECT 1");
    console.log("Database connection successful");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw new Error("Failed to connect to database. Please check your DATABASE_URL environment variable.");
  }

  try {
    console.log("Running migrations...");
    
    // Read and execute the initial schema
    const initialSchema = await fs.readFile(join(process.cwd(), "migrations", "0000_glorious_blade.sql"), "utf-8");
    // Split the file by statement-breakpoint and execute each statement
    const statements = initialSchema.split("--> statement-breakpoint");
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        console.log("Executing statement:", trimmedStatement.substring(0, 50) + "...");
        await client.query(trimmedStatement);
      }
    }
    
    // Read and execute the migration for used attack spells
    const addUsedAttackSpells = await fs.readFile(join(process.cwd(), "migrations", "0001_add_used_attack_spells.sql"), "utf-8");
    // Split the file by semicolon and execute each statement
    const migrationStatements = addUsedAttackSpells.split(";");
    for (const statement of migrationStatements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        console.log("Executing migration statement:", trimmedStatement.substring(0, 50) + "...");
        await client.query(trimmedStatement);
      }
    }
    
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Failed to run migrations:", error);
    throw new Error("Failed to run database migrations. Please check your database schema.");
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }

  console.log("Database initialization completed");
}