import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { saveAs } from "file-saver";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export default function ExcelUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(""); // Store original filename without extension
  const [previewData, setPreviewData] = useState({}); // Object: { sheetName: data }
  const [sheetNames, setSheetNames] = useState([]); // Array of sheet names
  const [activeSheet, setActiveSheet] = useState(0); // Index of active sheet
  const [processedPreviewData, setProcessedPreviewData] = useState({}); // Object: { sheetName: data }
  const [processedSheetNames, setProcessedSheetNames] = useState([]);
  const [activeProcessedSheet, setActiveProcessedSheet] = useState(0);
  const [processedBase64, setProcessedBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // 'success', 'error', 'warning', 'info'
  });

  // Helper function to show snackbar
  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // 1️⃣ Handle file select & local preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    
    // Store original filename without extension
    const fileNameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, "");
    setOriginalFileName(fileNameWithoutExt);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const sheets = {};
      
      // Read all sheets
      wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        sheets[sheetName] = data;
      });
      
      setSheetNames(wb.SheetNames);
      setPreviewData(sheets);
      setActiveSheet(0); // Reset to first sheet
      showSnackbar(`File "${file.name}" loaded successfully`, "success");
    };
    reader.readAsBinaryString(file);
  };

  // 2️⃣ Convert file to Base64 & send to backend
  const handleUpload = async () => {
    if (!selectedFile) {
      showSnackbar("Please select a file first!", "warning");
      return;
    }
    setLoading(true);

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const base64String = event.target.result.split(",")[1]; // remove data prefix

      try {
        const res = await axios.post("http://localhost:5000/api/processExcel", {
          fileData: base64String,
        });

        if (res.data?.processedFile) {
          setProcessedBase64(res.data.processedFile);
          showSnackbar("File processed successfully!", "success");
        } else {
          showSnackbar("No processed file data received.", "error");
        }
      } catch (err) {
        console.error(err);
        showSnackbar("Error processing file. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    };

    fileReader.readAsDataURL(selectedFile); // Convert to Base64
  };

  // 3️⃣ Preview processed Excel (Base64 → XLSX)
  const handlePreviewProcessed = () => {
    if (!processedBase64) {
      showSnackbar("No processed file available.", "warning");
      return;
    }

    const binary = atob(processedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const wb = XLSX.read(bytes, { type: "array" });
    const sheets = {};
    
    // Read all sheets
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      sheets[sheetName] = data;
    });
    
    setProcessedSheetNames(wb.SheetNames);
    setProcessedPreviewData(sheets);
    setActiveProcessedSheet(0); // Reset to first sheet
  };

  // 4️⃣ Download processed file
  const handleDownload = () => {
    if (!processedBase64) {
      showSnackbar("No processed file available.", "warning");
      return;
    }

    const binary = atob(processedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    
    // Use original filename with "_processed" suffix
    const downloadFileName = originalFileName 
      ? `${originalFileName}_processed.xlsx`
      : "processed.xlsx";
    
    saveAs(blob, downloadFileName);
    showSnackbar(`File "${downloadFileName}" downloaded successfully!`, "success");
  };

  // 🔹 Render Table
  const renderTable = (data) => {
    if (!data || data.length === 0) return null;
    
    // Get max columns to ensure consistent table width
    const maxCols = Math.max(...data.map(row => row?.length || 0), 1);
    
    return (
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 500, 
          overflow: "auto",
          mx: "auto",
          width: "100%"
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {data[0]?.map((col, i) => (
                <TableCell 
                  key={i} 
                  sx={{ 
                    fontWeight: "bold", 
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    top: 0,
                    zIndex: 1
                  }}
                >
                  {col || `Column ${i + 1}`}
                </TableCell>
              ))}
              {/* Fill empty cells if header row is shorter */}
              {Array.from({ length: Math.max(0, maxCols - (data[0]?.length || 0)) }).map((_, i) => (
                <TableCell 
                  key={`empty-${i}`} 
                  sx={{ 
                    fontWeight: "bold", 
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    top: 0,
                    zIndex: 1
                  }}
                >
                  {`Column ${(data[0]?.length || 0) + i + 1}`}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(1).map((row, i) => (
              <TableRow key={i}>
                {Array.from({ length: maxCols }).map((_, j) => (
                  <TableCell key={j}>{row?.[j] || ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box 
      sx={{ 
        p: 4, 
        maxWidth: 1200, 
        width: "100%",
        mx: "auto", 
        fontFamily: "sans-serif",
        backgroundColor: "#ffffff",
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        textAlign: "center"
      }}
    >
      <Typography 
        variant="h5" 
        gutterBottom 
        sx={{ 
          color: "#213547",
          fontWeight: 600,
          mb: 3
        }}
      >
        Excel Upload & Preview 
      </Typography>

      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center" 
        justifyContent="center"
        sx={{ mb: 3 }}
      >
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ borderRadius: 2 }}
        >
          Choose File
          <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
        </Button>

        {selectedFile && (
          <Typography variant="body1" color="text.secondary">
            {selectedFile.name}
          </Typography>
        )}
      </Stack>

      {sheetNames.length > 0 && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography 
            variant="subtitle1" 
            gutterBottom 
            sx={{ 
              color: "#213547",
              fontWeight: 600,
              mb: 2
            }}
          >
            Preview of Uploaded File
          </Typography>
          {sheetNames.length > 1 && (
            <Box sx={{ 
              mb: 2, 
              borderBottom: 1, 
              borderColor: "divider",
              width: "100%",
              overflowX: "auto"
            }}>
              <Tabs
                value={activeSheet}
                onChange={(e, newValue) => setActiveSheet(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ 
                  width: "100%",
                  "& .MuiTabs-scrollButtons": {
                    "&.Mui-disabled": {
                      opacity: 0.3
                    }
                  }
                }}
              >
                {sheetNames.map((name, index) => (
                  <Tab key={index} label={name} sx={{ textTransform: "none" }} />
                ))}
              </Tabs>
            </Box>
          )}
          {renderTable(previewData[sheetNames[activeSheet]] || [])}
        </Box>
      )}

      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ mt: 4, justifyContent: "center", flexWrap: "wrap" }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          startIcon={<CloudUploadIcon />}
          disabled={!selectedFile || loading}
          sx={{ borderRadius: 2 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : "Upload & Process"}
        </Button>

        {processedBase64 && (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={handlePreviewProcessed}
              startIcon={<VisibilityIcon />}
              sx={{ borderRadius: 2 }}
            >
              Preview Processed
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: 2 }}
            >
              Download
            </Button>
          </>
        )}
      </Stack>

      {processedSheetNames.length > 0 && (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography 
            variant="subtitle1" 
            gutterBottom 
            sx={{ 
              color: "#213547",
              fontWeight: 600,
              mb: 2
            }}
          >
            Processed File Preview
          </Typography>
          {processedSheetNames.length > 1 && (
            <Box sx={{ 
              mb: 2, 
              borderBottom: 1, 
              borderColor: "divider",
              width: "100%",
              overflowX: "auto"
            }}>
              <Tabs
                value={activeProcessedSheet}
                onChange={(e, newValue) => setActiveProcessedSheet(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ 
                  width: "100%",
                  "& .MuiTabs-scrollButtons": {
                    "&.Mui-disabled": {
                      opacity: 0.3
                    }
                  }
                }}
              >
                {processedSheetNames.map((name, index) => (
                  <Tab key={index} label={name} sx={{ textTransform: "none" }} />
                ))}
              </Tabs>
            </Box>
          )}
          {renderTable(processedPreviewData[processedSheetNames[activeProcessedSheet]] || [])}
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
