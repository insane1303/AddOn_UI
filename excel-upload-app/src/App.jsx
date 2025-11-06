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
      // Prepare request - send only excelFile format
      // Format: { userInput: string, excelFile: base64 }
      const requestPayload = {
        userInput: requestData.userInput || "",
        excelFile: requestData.excelFile || null,
      };
      
      console.log("Sending request with payload:", {
        hasUserInput: !!requestPayload.userInput,
        hasExcelFile: !!requestPayload.excelFile,
      });
      
      // Send to backend with the structure: { userInput: string, excelFile: base64 }
      const response = await axios.post(
        "http://localhost:5000/api/processExcel",
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Handle response - backend should return processedFile in base64 format
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
        // Extract processed file from response - try multiple possible field names
        const processedFile = 
          responseData.processedFile || 
          responseData.processed_file || 
          responseData.fileData ||
          responseData.processedFileBase64 ||
          (responseData.data && responseData.data.processedFile);
        
        console.log("Extracted processedFile:", processedFile ? "Found" : "Not found");
        console.log("ProcessedFile type:", typeof processedFile);
        console.log("ProcessedFile length:", processedFile ? processedFile.length : 0);
        console.log("ProcessedFile preview:", processedFile ? processedFile.substring(0, 50) + "..." : "N/A");
        
        if (processedFile && typeof processedFile === 'string' && processedFile.length > 0) {
          setProcessedFileBase64(processedFile);
          // Generate filename based on original file name if available, or use timestamp
          const fileName = responseData.fileName || 
            responseData.filename ||
            (originalFileName ? `${originalFileName}_processed.xlsx` : null) ||
            `processed_file_${new Date().getTime()}.xlsx`;
          return {
            message: responseData.message || "File processed successfully",
            processedFile: processedFile,
            fileName: fileName,
            success: true,
          };
        }
        
        // If no processed file but we have a message, still return success
        console.warn("No processed file found in response. Response structure:", responseData);
        return {
          message: responseData.message || "Request processed successfully",
          processedFile: null,
          success: true,
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
