import { PersonRecord } from "./types";

interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createAndPopulateGoogleSheet(
  accessToken: string,
  queryTitle: string,
  data: PersonRecord[]
): Promise<ExportResult> {
  // 1. Create the spreadsheet
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `TruePeopleSearch Export - ${queryTitle}`,
      },
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to create spreadsheet: ${createResponse.statusText}`
    );
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Prepare spreadsheet values
  const headers = [
    "Full Name",
    "Age",
    "Current Address",
    "Past Addresses",
    "Phone Numbers",
    "Relatives / Associates",
    "Email Addresses",
  ];

  const rows = data.map((person) => [
    person.name,
    person.age || "N/A",
    person.currentAddress || "N/A",
    (person.pastAddresses || []).join(" | "),
    (person.phoneNumbers || []).join(" | "),
    (person.relatives || []).join(" | "),
    (person.emailAddresses || []).join(" | "),
  ]);

  const values = [headers, ...rows];

  // 3. Append the spreadsheet rows
  const appendResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: "Sheet1!A1",
        majorDimension: "ROWS",
        values,
      }),
    }
  );

  if (!appendResponse.ok) {
    const errorData = await appendResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to write data rows: ${appendResponse.statusText}`
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
  };
}
