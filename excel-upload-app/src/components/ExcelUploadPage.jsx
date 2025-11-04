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
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export default function ExcelUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [processedPreviewData, setProcessedPreviewData] = useState([]);
  const [processedBase64, setProcessedBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1️⃣ Handle file select & local preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      setPreviewData(data);
    };
    reader.readAsBinaryString(file);
  };

  // 2️⃣ Convert file to Base64 & send to backend
  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");
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
          alert("File processed successfully.");
        } else {
          alert("No processed file data received.");
        }
      } catch (err) {
        console.error(err);
        alert("Error processing file.");
      } finally {
        setLoading(false);
      }
    };

    fileReader.readAsDataURL(selectedFile); // Convert to Base64
  };

  // 3️⃣ Preview processed Excel (Base64 → XLSX)
  const handlePreviewProcessed = () => {
    if (!processedBase64) return alert("No processed file available.");

    const binary = atob(processedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const wb = XLSX.read(bytes, { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    setProcessedPreviewData(data);
  };

  // 4️⃣ Download processed file
  const handleDownload = () => {
    if (!processedBase64) return alert("No processed file available.");

    const binary = atob(processedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "processed.xlsx");
  };

  // 🔹 Render Table
  const renderTable = (data) => (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {data[0]?.map((col, i) => (
              <TableCell key={i} sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.slice(1).map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: "auto", fontFamily: "sans-serif" }}>
      <Typography variant="h5" gutterBottom>
        Excel Upload & Preview 
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
        >
          Choose File
          <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
        </Button>

        {selectedFile && (
          <Typography variant="body1" color="text.danger">
            {selectedFile.name}
          </Typography>
        )}
      </Stack>

      {previewData.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Preview of Uploaded File
          </Typography>
          {renderTable(previewData)}
        </Box>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          startIcon={<CloudUploadIcon />}
          disabled={!selectedFile || loading}
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
            >
              Preview Processed
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
            >
              Download
            </Button>
          </>
        )}
      </Stack>

      {processedPreviewData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Processed File Preview
          </Typography>
          {renderTable(processedPreviewData)}
        </Box>
      )}
    </Box>
  );
}
