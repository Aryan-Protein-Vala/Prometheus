Phase 1: The "Brain" Setup (Rust + Ollama)
We need to make Tauri talk to Phi-3 running locally on the user's machine.

Step 1: Initialize Tauri (If you haven't) Open your terminal in Cursor:

Bash

npm install -g @tauri-apps/cli
pnpm tauri init
# Choose: npm, plain javascript (or typescript), and react
Step 2: Add Dependencies to Rust We need Rust to send HTTP requests to Ollama.

Open src-tauri/Cargo.toml.

Add these under [dependencies]:

Ini, TOML

reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
Step 3: The "Ollama Bridge" (Copy into Cursor) Ask Cursor: "Create a Rust command in main.rs that takes a user prompt, sends it to http://localhost:11434/api/generate (Phi-3), and returns the text. Handle errors gracefully."

It should generate something like this for src-tauri/src/main.rs:

Rust

use tauri::command;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize)]
struct OllamaResponse {
    response: String,
}

#[command]
async fn ask_prometheus(prompt: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client.post("http://localhost:11434/api/generate")
        .json(&json!({
            "model": "phi3:mini",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let body: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
        Ok(body.response)
    } else {
        Err("Ollama is offline or unreachable.".into())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ask_prometheus])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
Phase 2: The Intelligence (The System Prompt)
This is where you win or lose. Phi-3 is small (3.8B), so we must be precise.

The "Categorizer" Prompt Strategy: Don't ask Phi-3 to "clean my files." Ask it to Label them. The code does the moving, the AI just decides where.

Cursor Prompt: "I need a TypeScript function that scans a directory, gets a list of filenames, and sends them to the Rust backend to be categorized."

The "God Mode" System Prompt for Phi-3: When you send the file list to the AI, wrap it in this exact prompt structure:

Plaintext

SYSTEM: You are PROMETHEUS, a strict file organization engine. 
You categorize files based on their names and extensions into these folders: 
[Documents, Images, Installers, Finance, Code, Archives].

RULES:
1. Return ONLY JSON. No yapping.
2. If a file is a screenshot (e.g., "Screen Shot 2024..."), categorize as "Images".
3. If a file is "invoice.pdf", categorize as "Finance".
4. If uncertain, categorize as "Misc".

INPUT FILES:
["resume.pdf", "Screen Shot 2025-01.png", "setup.exe", "invoice_dec.pdf"]

OUTPUT FORMAT:
{
  "resume.pdf": "Documents",
  "Screen Shot 2025-01.png": "Images",
  "setup.exe": "Installers",
  "invoice_dec.pdf": "Finance"
}
Why this works: You force the small model to output strictly structured data (JSON) which your code can parse and execute safely.

Phase 3: The "Kill Switch" (Safety)
To be "Best," you need a safety net that CleanMyMac doesn't strictly have in the same way.

The Trash Can Rule:

NEVER use fs.remove or std::fs::remove_file.

ALWAYS use a library that moves to system trash (e.g., in Rust: trash crate).

Add to Cargo.toml: trash = "3.0"

Rust Command:

Rust

#[command]
fn move_to_trash(path: String) -> Result<(), String> {
    trash::delete(path).map_err(|e| e.to_string())
}
The "Undo" Button:

Before any operation, write the {original_path, timestamp} to a local undo_log.json.

If the user hits "Undo", your app reads the log and moves the file back. This is your "Killer Feature."