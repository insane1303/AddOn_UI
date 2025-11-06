import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // important for base64

app.post("/api/processExcel", (req, res) => {
  const { userInput, excelFile } = req.body;

  // Excel file is optional - user can chat with AI about previously processed files
  if (excelFile) {
    // Process the Excel file based on user input
    // For now, simulating processing (echoing same data back)
    // In a real scenario, you would process the file based on userInput
    const processedFile = excelFile;

    res.json({ 
      processedFile,
      message: "File processed successfully"
    });
  } else {
    // No file provided - respond to user input about previously processed file
    // In a real scenario, this would be handled by AI to work with previously processed files
    let responseMessage = "I can help you with the processed file.";
    
    if (userInput && userInput.trim()) {
      const lowerInput = userInput.toLowerCase().trim();
      
      // Provide contextual responses based on user input
      if (lowerInput.includes("send") || lowerInput.includes("upload") || lowerInput.includes("attach")) {
        responseMessage = "Yes, you can send an Excel file. Please attach it using the paperclip icon.";
      } else if (lowerInput.includes("download") || lowerInput.includes("get") || lowerInput.includes("file")) {
        responseMessage = "You can download the processed file using the download button in the chat.";
      } else if (lowerInput.includes("help") || lowerInput.includes("what") || lowerInput.includes("how")) {
        responseMessage = "I can help you process Excel files. Attach a file to get started, or ask me about the currently processed file.";
      } else if (lowerInput.includes("hi") || lowerInput.includes("hello") || lowerInput.includes("hey")) {
        responseMessage = "Hello! I can help you process Excel files. Attach a file or ask me about the processed file.";
      } else {
        responseMessage = "I'm working with the processed file. How can I help you?";
      }
    }
    
    res.json({ 
      message: responseMessage
    });
  }
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
