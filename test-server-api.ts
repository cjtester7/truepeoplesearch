import fetch from "node-fetch";

async function runTest() {
  console.log("Sending query to local server search endpoint...");
  try {
    const response = await fetch("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "name",
        query: "John Doe",
        location: "Los Angeles, CA"
      })
    });

    console.log("Response status:", response.status);
    const text = await response.text();
    console.log("Response body:", text);
  } catch (err: any) {
    console.error("Connection failed:", err.message || err);
  }
}

runTest();
