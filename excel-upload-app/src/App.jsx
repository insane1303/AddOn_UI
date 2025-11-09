import React, { useState } from "react";
import ChatBox from "./components/ChatBox";
import ExcelPreview from "./components/ExcelPreview";
import axios from "axios";
import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

const MainContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  height: "100vh",
  width: "100%",
  overflow: "hidden",
}));

function App() {
  const [loading, setLoading] = useState(false);
  const [processedFileBase64, setProcessedFileBase64] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);

  const handleSendMessage = async (requestData) => {
    setLoading(true);
    try {
      // Prepare request - send only base64file format
      // Format: { input: string, base64file: base64 }
      const requestPayload = {
        input: requestData.userInput || "",
        base64file: requestData.excelFile || null,
      };
      
      console.log("Sending request with payload:", {
        hasInput: !!requestPayload.input,
        hasBase64File: !!requestPayload.base64file,
      });
      
      // Send to backend with the structure: { input: string, base64file: base64 }
      const response = await axios.post(
        "https://fern-subfrontal-unathletically.ngrok-free.dev/query",
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Handle response - backend returns { ok, content, base64file, ... }
      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response data type:", typeof response.data);
      console.log("Response data keys:", response.data ? Object.keys(response.data) : "no data");
      
      // Check if response.data is a string (might be JSON stringified)
      let responseData = response.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          console.warn("Could not parse response as JSON:", e);
        }
      }
      
      if (responseData) {
        // Extract content message from response
        const contentMessage = responseData.content || responseData.message || "Request processed successfully";
        
        // Extract processed file from base64file field
        const processedFile = responseData.base64file || null;
        
        console.log("Extracted content:", contentMessage ? "Found" : "Not found");
        console.log("Extracted base64file:", processedFile ? "Found" : "Not found");
        console.log("Base64file length:", processedFile ? processedFile.length : 0);
        console.log("Base64file preview:", processedFile ? processedFile.substring(0, 50) + "..." : "N/A");
        
        if (processedFile && typeof processedFile === 'string' && processedFile.length > 0) {
          setProcessedFileBase64(processedFile);
          // Generate filename based on original file name if available, or use timestamp
          const fileName = responseData.fileName || 
            responseData.filename ||
            responseData.current_file_path ? responseData.current_file_path.split('/').pop() : null ||
            (originalFileName ? `${originalFileName}_processed.xlsx` : null) ||
            `processed_file_${new Date().getTime()}.xlsx`;
          return {
            message: contentMessage,
            processedFile: processedFile,
            fileName: fileName,
            success: responseData.ok !== false,
          };
        }
        
        // If no processed file but we have content message, still return success
        console.warn("No base64file found in response. Response structure:", responseData);
        return {
          message: contentMessage,
          processedFile: null,
          success: responseData.ok !== false,
        };
      }
      
      console.error("No response data received");
      return {
        message: "Request sent successfully",
        processedFile: null,
        success: true,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to process file";
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainContainer>
      <ExcelPreview processedFileBase64={processedFileBase64} />
      <ChatBox 
        onSendMessage={handleSendMessage} 
        loading={loading}
        processedFileBase64={processedFileBase64}
        onFileNameChange={setOriginalFileName}
      />
    </MainContainer>
  );
}

export default App;
