// Version: 7
// Description: Relaxed schema constraints and optimized public record grounding search prompts to ensure all matching results are successfully compiled and returned without being dropped due to missing optional fields.

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function formatGeminiError(error: any): string {
  const errorStr = typeof error === "string" ? error : (error.message || String(error));
  
  if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("limit")) {
    return "Gemini API Quota Exceeded (429): Your Google AI Studio API key has reached its current daily or monthly usage quota limits, or search grounding requests are restricted. Please check your plan details under Google AI Studio > Settings > Billing, or use a billing-enabled key.";
  }
  
  if (errorStr.includes("API_KEY_INVALID") || errorStr.includes("API key not valid")) {
    return "Invalid Gemini API Key: The key provided in Settings > Secrets is not valid. Please check your API key in Google AI Studio.";
  }
  
  return errorStr;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Search API using Gemini Search Grounding
  app.post("/api/search", async (req, res) => {
    try {
      const { type, query, location } = req.body;

      if (!type || !query) {
        return res.status(400).json({ error: "Search type and query criteria are required." });
      }

      const client = getGeminiClient();

      // Enriched query details for different search types to assist grounding execution
      let searchDetails = query;
      if (type === "phone") {
        const cleanPhone = query.replace(/\D/g, "");
        if (cleanPhone.length === 10) {
          const f1 = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
          const f2 = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
          searchDetails = `${cleanPhone} (also formatted as "${f1}" or "${f2}")`;
        }
      }

      const prompt = `You are an expert public records investigator. Perform a live Google search to look up people directory listings, whitepages records, and background registers based on the following criteria:
Type of Search: ${type.toUpperCase()}
Search Query: ${searchDetails}
Location Filter (City, State): ${location || "None specified"}

Search Guidelines:
1. Search public directories, whitepages registries, and people search sites (such as truepeoplesearch, fastpeoplesearch, whitepages, spokeo, clustrmaps, etc.) for records matching the criteria.
2. Compile potential matching individuals based on the search snippets and live details.
3. For each matching person found, summarize their name, estimated age, current or last known address, prior addresses, associated phone numbers, relatives or close associates, and email addresses.
4. If no records matching the query are found, state "No matches found on public directories."`;

      // Step 1: Perform live web search grounding using Gemini
      const groundingResponse = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const groundedText = groundingResponse.text || "No matches found on public directories.";

      // Step 2: Use Gemini to parse the grounded text into strict JSON conforming to our schema
      const parsePrompt = `You are a data-formatting assistant. Convert the following public records grounding search results into a clean, structured JSON array of matching individuals.
      
Each object in the array MUST conform to this exact schema structure:
- name: string (Full name of the person)
- age: string (Age estimate, e.g. "45", or "N/A" if unknown)
- currentAddress: string (Current/last known address, or "N/A" if unknown)
- pastAddresses: array of strings (List of previous addresses, or empty array [])
- phoneNumbers: array of strings (List of telephone numbers, or empty array [])
- relatives: array of strings (Names of family members or close associates, or empty array [])
- emailAddresses: array of strings (Associated email addresses, or empty array [])

Grounding Results:
"""
${groundedText}
"""

Ensure you extract up to 10 matching individuals. If the grounding results state that no matches were found, or contain no clear personal listings, return an empty array [].
Your output must contain only raw JSON without any markdown formatting wrappers or extra commentary.`;

      const jsonResponse = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: parsePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Full name" },
                age: { type: Type.STRING, description: "Age of the person, or 'N/A'" },
                currentAddress: { type: Type.STRING, description: "Current/last known address, or 'N/A'" },
                pastAddresses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of prior addresses"
                },
                phoneNumbers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of associated phone numbers"
                },
                relatives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of relatives or close associates"
                },
                emailAddresses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of associated email addresses"
                }
              },
              required: ["name"]
            }
          }
        }
      });

      const responseText = jsonResponse.text || "[]";
      let results = [];
      try {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed)) {
          // Safeguard the structure to always conform fully to the PersonRecord type interface
          results = parsed.map((item: any) => ({
            name: String(item.name || "").trim() || "Unknown Name",
            age: String(item.age || "N/A"),
            currentAddress: String(item.currentAddress || "N/A"),
            pastAddresses: Array.isArray(item.pastAddresses) ? item.pastAddresses.map(String) : [],
            phoneNumbers: Array.isArray(item.phoneNumbers) ? item.phoneNumbers.map(String) : [],
            relatives: Array.isArray(item.relatives) ? item.relatives.map(String) : [],
            emailAddresses: Array.isArray(item.emailAddresses) ? item.emailAddresses.map(String) : [],
          }));
        } else {
          results = [];
        }
      } catch (err) {
        console.error("Failed to parse Gemini response as JSON:", responseText, err);
        return res.status(500).json({ error: "The search engine response could not be parsed. Please try again." });
      }

      // Collect sources from the initial search grounding metadata
      const sources = groundingResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || "Public Registry Index",
        url: chunk.web?.uri || ""
      })).filter((s: any) => s.url) || [];

      res.json({
        success: true,
        results,
        sources,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Gemini Search Grounding Error:", error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start custom express server:", err);
});
