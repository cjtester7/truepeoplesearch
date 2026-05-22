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

      const prompt = `You are an expert public records investigator. Perform a live web search to look up people directory listings, census information, background details, and truepeoplesearch-style records based on the following criteria:
Type of Search: ${type.toUpperCase()}
Search Query: ${query}
Location Filter (City, State): ${location || "None specified"}

Instruction:
1. Use Google Search to find public records, public phone directories, address registers, whitepages indexes, and TruePeopleSearch links matches.
2. Cross-reference the names, past addresses, relatives, and phone records to find up to 10 matching individuals.
3. Consolidate and format the findings strictly as a JSON array where each object has these exact fields:
   - name: string (Full name of the person)
   - age: string (Age estimate, e.g. "45", or "N/A")
   - currentAddress: string (Current or last known physical address)
   - pastAddresses: array of strings (Past residential addresses, up to 5 items)
   - phoneNumbers: array of strings (Known telephone numbers, up to 5 items)
   - relatives: array of strings (Names of relatives, associates or family members, up to 5 items)
   - emailAddresses: array of strings (Known email addresses, up to 3 items)

If no matching people are found on public directories for this query, return an empty array [].
Output must be strictly raw, valid JSON array. Do not include any conversational explanation before or after the JSON.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const responseText = response.text || "";
      console.log("Raw Gemini Response received:", responseText);

      let results: any[] = [];
      const trimmed = responseText.trim();
      
      // Helper function to extract JSON array
      const extractJsonArray = (text: string): any[] => {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === "object" && Array.isArray(parsed.results)) {
            return parsed.results;
          }
        } catch {
          // Fall through regex
        }

        // Try extracting using Markdown JSON regex block
        const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
        const match = text.match(jsonBlockRegex);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1].trim());
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.results)) {
              return parsed.results;
            }
          } catch {
            // Fall through bracket extractor
          }
        }

        // Attempt bracket extraction
        const firstBracket = text.indexOf("[");
        const lastBracket = text.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          try {
            const candidate = text.slice(firstBracket, lastBracket + 1);
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Unable to parse
          }
        }

        return [];
      };

      results = extractJsonArray(trimmed);

      // Ensure that results array elements have default safe empty arrays if missing
      results = results.map((item: any) => ({
        name: String(item.name || "Unknown Individual"),
        age: String(item.age || "N/A"),
        currentAddress: String(item.currentAddress || "Not Available"),
        pastAddresses: Array.isArray(item.pastAddresses) ? item.pastAddresses.map(String) : [],
        phoneNumbers: Array.isArray(item.phoneNumbers) ? item.phoneNumbers.map(String) : [],
        relatives: Array.isArray(item.relatives) ? item.relatives.map(String) : [],
        emailAddresses: Array.isArray(item.emailAddresses) ? item.emailAddresses.map(String) : []
      }));

      // Collect sources from search grounding metadata
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
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
      res.status(500).json({ error: error.message || "An error occurred during search processing." });
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
