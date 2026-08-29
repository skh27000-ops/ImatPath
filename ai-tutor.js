// ================================================================
// ImatPath — AI Tutor (Gemini Integration)
// ================================================================

(function () {
  const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

  async function askQuestion(questionData, studentQuery) {
    if (!window.ImatConfig || !window.ImatConfig.GEMINI_API_KEY || window.ImatConfig.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      throw new Error("Missing Gemini API Key. Please add it to config.js");
    }

    const apiKey = window.ImatConfig.GEMINI_API_KEY;

    // Format the prompt
    let prompt = `You are an expert IMAT (International Medical Admissions Test) tutor. A student needs help with a specific question.
Be encouraging, extremely clear, and concise. Format your response beautifully in HTML (using bold <strong> tags, <br> for breaks, and <ul> for lists if necessary) because your output will be directly injected into the webpage. DO NOT USE MARKDOWN LIKE **bold**. Use ONLY standard HTML tags for formatting.

--- QUESTION DATA ---
Question: ${questionData.question}
Options:
A) ${questionData.options[0] || ""}
B) ${questionData.options[1] || ""}
C) ${questionData.options[2] || ""}
D) ${questionData.options[3] || ""}
E) ${questionData.options[4] || ""}

The Correct Answer is: Option ${['A','B','C','D','E'][questionData.correct]}

The Provided Solution Explanation:
${questionData.solution || "No official solution provided."}

--- STUDENT'S SPECIFIC QUESTION ---
"${studentQuery}"

--- YOUR INSTRUCTIONS ---
Address the student's specific question directly. Explain why the correct answer is right and why their confusion might be justified but ultimately flawed.
Remember, answer strictly with HTML formatted text (no markdown formatting).`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    try {
      const response = await fetch(GEMINI_URL + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Error from Gemini API");
      }

      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No response generated.");
      }
    } catch (err) {
      console.error("[AITutor] Error:", err);
      throw err;
    }
  }

  window.ImatAITutor = {
    ask: askQuestion
  };
})();
