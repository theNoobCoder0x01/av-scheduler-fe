import { initializeDB } from "@/lib/db";

export async function GET(request: Request, response: Response) {
  // fetch data from the database
  const dbResponse = await initializeDB();
  console.log("dbResponse: " + dbResponse);
  // Logic to create a new user in the database
  return Response.json(
    { message: "Database initialized successfully", data: dbResponse },
    { status: 200 }
  );
}
