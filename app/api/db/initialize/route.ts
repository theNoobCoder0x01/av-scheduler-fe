import { initializeDB } from "@/lib/db";
import type { NextApiRequest, NextApiResponse } from "next";

export async function GET(request: NextApiRequest, response: NextApiResponse) {
  // fetch data from the database
  const dbResponse = await initializeDB();
  console.log("dbResponse", dbResponse);
  // Logic to create a new user in the database
  return Response.json(
    { message: "Database initialized successfully", data: dbResponse },
    { status: 200 }
  );
}
