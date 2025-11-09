import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { saveAs } from "file-saver";
import "./ChatBox.css";

export default function ChatBox({ onSendMessage, loading, processedFileBase64, onFileNameChange }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [currentProcessedFile, setCurrentProcessedFile] = useState(null);
  const [processedFileName, setProcessedFileName] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update current processed file when prop changes
  useEffect(() => {
    if (processedFileBase64) {
      setCurrentProcessedFile(processedFileBase64);
    }
  }, [processedFileBase64]);
  
  // Store original filename when file is attached
  const [originalFileName, setOriginalFileName] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Only allow Excel files
      if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        setAttachedFile(file);
        // Store original filename for later use
        const fileNameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, "");
        setOriginalFileName(fileNameWithoutExt);
        // Notify parent component about the filename
        if (onFileNameChange) {
          onFileNameChange(fileNameWithoutExt);
        }
        // Don't add a system message - file will be shown with user's message when sent
      } else {
        alert("Please select an Excel file (.xlsx or .xls)");
        event.target.value = "";
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedFile) {
      return;
    }

    // Add user message to chat with attachment info
    const userMessage = {
      id: Date.now(),
      text: inputValue.trim() || "",
      isUser: true,
      hasAttachment: !!attachedFile,
      attachmentFileName: attachedFile ? attachedFile.name : null,
    };
    setMessages((prev) => [...prev, userMessage]);

    const messageText = inputValue.trim();
    setInputValue("");

    // Prepare data for backend
    let fileBase64 = null;
    if (attachedFile) {
      fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(attachedFile);
      });
    }

    // Prepare JSON structure with user input and file base64
    const requestData = {
      userInput: messageText || "",
      excelFile: fileBase64 || null,
    };

    // Call the parent handler
    if (onSendMessage) {
      try {
        const response = await onSendMessage(requestData);
        // Add response message if available
        if (response) {
          const responseMessage = typeof response === "string" 
            ? response 
            : response.message || (response.success ? "Request processed successfully" : "Request failed");
          
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              text: responseMessage,
              isUser: false,
              hasProcessedFile: response.processedFile ? true : false,
              fileName: response.fileName || null,
            },
          ]);
        }
      } catch (error) {
        // Show error message with fallback
        const errorMessage = error.message || "Failed to process file";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: errorMessage,
            isUser: false,
            hasProcessedFile: false,
            isError: true,
          },
        ]);
      }
    }

    // Clear attachment after sending
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleDownloadProcessedFile = (fileName) => {
    if (!currentProcessedFile) {
      return;
    }

    try {
      // Convert base64 to blob
      const binary = atob(currentProcessedFile);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Download the file with the provided filename or default
      const downloadFileName = fileName || processedFileName || `processed_file_${new Date().getTime()}.xlsx`;
      saveAs(blob, downloadFileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  // Format markdown-like text to readable format
  const formatMessageText = (text) => {
    if (!text) return null;

    // Split by lines to process each line
    const lines = text.split(/\n/);
    const elements = [];
    let currentList = [];
    let currentParagraph = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <Box key={`list-${elements.length}`} sx={{ mb: 1.5 }}>
            {currentList.map((item, idx) => (
              <Box key={idx} sx={{ mb: 1, display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Typography component="span" sx={{ fontWeight: 600, minWidth: "28px", flexShrink: 0 }}>
                  {item.number}.
                </Typography>
                <Typography component="span" variant="body2" sx={{ flex: 1, lineHeight: 1.6 }}>
                  {formatInlineText(item.text)}
                </Typography>
              </Box>
            ))}
          </Box>
        );
        currentList = [];
      }
    };

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(" ");
        if (paragraphText.trim()) {
          elements.push(
            <Box key={`para-${elements.length}`} sx={{ mb: 1.5, lineHeight: 1.6 }}>
              <Typography variant="body2" component="div">
                {formatInlineText(paragraphText)}
              </Typography>
            </Box>
          );
        }
        currentParagraph = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if it's a numbered list item (1., 2., etc.)
      const listMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        currentList.push({
          number: listMatch[1],
          text: listMatch[2]
        });
        return;
      }

      // Check if it's a header (### or ##)
      if (trimmedLine.startsWith("###")) {
        flushList();
        flushParagraph();
        const headerText = trimmedLine.replace(/^###+\s*/, "");
        elements.push(
          <Typography 
            key={`header-${elements.length}`} 
            variant="subtitle2" 
            sx={{ fontWeight: 700, mb: 1, mt: elements.length > 0 ? 2 : 0, fontSize: "0.95rem" }}
          >
            {formatInlineText(headerText)}
          </Typography>
        );
        return;
      }

      // If we have a list and this line is not a list item, flush the list
      if (currentList.length > 0 && !listMatch) {
        flushList();
      }

      // Regular text line
      if (trimmedLine) {
        currentParagraph.push(trimmedLine);
      } else if (currentParagraph.length > 0) {
        // Empty line - flush current paragraph
        flushParagraph();
      }
    });

    // Flush any remaining content
    flushList();
    flushParagraph();

    return elements.length > 0 ? elements : formatInlineText(text);
  };

  // Format inline markdown (bold, line breaks)
  const formatInlineText = (text) => {
    if (!text) return null;

    // Split by newlines first
    const lines = text.split(/\n/);
    
    return lines.map((line, lineIndex) => {
      const parts = [];
      let lastIndex = 0;
      
      // Find and replace **bold** text
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lineIndex}-${lastIndex}`}>
              {line.substring(lastIndex, match.index)}
            </span>
          );
        }
        // Add bold text
        parts.push(
          <strong key={`bold-${lineIndex}-${match.index}`}>
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(
          <span key={`text-${lineIndex}-${lastIndex}`}>
            {line.substring(lastIndex)}
          </span>
        );
      }
      
      return (
        <React.Fragment key={lineIndex}>
          {parts.length > 0 ? parts : line}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <Box className="chat-container">
      <Box className="chat-header">
        <Typography variant="h6" className="chat-header-title">
          Chat
        </Typography>
      </Box>

      <Box className="messages-container">
        {messages.length === 0 && (
          <Box className="empty-state">
            <Box className="empty-state-icon-container">
              <AttachFileIcon className="empty-state-icon" />
            </Box>
            <Typography variant="body1" className="empty-state-title">
              Start a conversation
            </Typography>
            <Typography variant="body2" className="empty-state-subtitle">
              Attach an Excel file or ask me about the processed file
            </Typography>
          </Box>
        )}
        {messages.map((message) => (
          <Box key={message.id} className="message-group">
            {message.hasProcessedFile && currentProcessedFile ? (
              // WhatsApp-style message with text and file card
              <Box className="file-message-container">
                {/* Response message text */}
                {message.text && (
                  <Paper 
                    className={`message-bubble message-bubble-assistant ${message.isError ? "message-bubble-error" : ""}`}
                    elevation={0}
                  >
                    <Box 
                      className={`message-text ${message.isError ? "message-text-error" : ""}`}
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {formatMessageText(message.text)}
                    </Box>
                  </Paper>
                )}
                {/* File card */}
                <Paper className="message-bubble message-bubble-assistant file-message-bubble" elevation={0}>
                  <Box className="file-card" onClick={() => handleDownloadProcessedFile(message.fileName)}>
                    <Box className="file-card-icon-container">
                      <InsertDriveFileIcon className="file-icon-white" />
                    </Box>
                    <Box className="file-card-content">
                      <Typography variant="body2" className="file-card-name">
                        {message.fileName || "Processed File.xlsx"}
                      </Typography>
                      <Typography variant="caption" className="file-card-type">
                        Excel file
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      className="file-card-download"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadProcessedFile(message.fileName);
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Box>
            ) : (
              // Regular message bubble with optional attachment
              <Paper 
                className={`message-bubble ${message.isUser ? "message-bubble-user" : "message-bubble-assistant"} ${message.isError ? "message-bubble-error" : ""}`}
                elevation={0}
              >
                {message.text && (
                  <Box 
                    className={`message-text ${message.hasAttachment ? "message-text-with-attachment" : ""} ${message.isError ? "message-text-error" : ""}`}
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    {message.isUser ? message.text : formatMessageText(message.text)}
                  </Box>
                )}
                {message.hasAttachment && message.attachmentFileName && (
                  <Box className={`message-attachment ${message.isUser ? "" : "message-attachment-assistant"}`}>
                    <AttachFileIcon className="attachment-icon-small" />
                    <Typography variant="body2" className="message-attachment-text">
                      {message.attachmentFileName}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        ))}
        {loading && (
          <Box className="loading-indicator">
            <CircularProgress size={18} className="loading-spinner" />
            <Typography variant="body2" className="loading-text">
              Processing...
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {attachedFile && (
        <Box className="attachment-container">
          <Typography variant="caption" className="attachment-info">
            <AttachFileIcon className="attachment-icon" />
            {attachedFile.name}
          </Typography>
          <IconButton
            size="small"
            className="attachment-remove"
            onClick={handleRemoveAttachment}
          >
            ×
          </IconButton>
        </Box>
      )}

      <Box className="input-container">
        <Stack direction="row" spacing={1} className="input-wrapper">
          <IconButton
            component="label"
            color="primary"
            className="attach-button"
            disabled={loading}
          >
            <AttachFileIcon />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </IconButton>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
            size="small"
            className="message-input"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={loading || (!inputValue.trim() && !attachedFile)}
            className="send-button"
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

