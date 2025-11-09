import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import "./ExcelPreview.css";

export default function ExcelPreview({ processedFileBase64 }) {
  const [previewData, setPreviewData] = useState({});
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (processedFileBase64) {
      setLoading(true);
      try {
        // Convert base64 to binary
        const binary = atob(processedFileBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        // Read Excel file
        const wb = XLSX.read(bytes, { type: "array" });
        const sheets = {};

        // Read all sheets
        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          sheets[sheetName] = data;
        });

        setSheetNames(wb.SheetNames);
        setPreviewData(sheets);
        setActiveSheet(0);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setPreviewData({});
      setSheetNames([]);
      setActiveSheet(0);
    }
  }, [processedFileBase64]);

  const renderTable = (data) => {
    if (!data || data.length === 0) return null;

    const maxCols = Math.max(...data.map((row) => row?.length || 0), 1);

    return (
      <TableContainer
        component={Paper}
        className="excel-preview-table-container"
      >
        <Table
          stickyHeader
          size="medium"
          className="excel-preview-table"
        >
          <TableHead>
            <TableRow>
              {data[0]?.map((col, i) => (
                <TableCell
                  key={i}
                  className="excel-preview-header-cell"
                >
                  {col || `Column ${i + 1}`}
                </TableCell>
              ))}
              {Array.from({
                length: Math.max(0, maxCols - (data[0]?.length || 0)),
              }).map((_, i) => (
                <TableCell
                  key={`empty-${i}`}
                  className="excel-preview-header-cell"
                >
                  {`Column ${(data[0]?.length || 0) + i + 1}`}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(1).map((row, i) => (
              <TableRow key={i} className="excel-preview-table-row">
                {Array.from({ length: maxCols }).map((_, j) => (
                  <TableCell
                    key={j}
                    className="excel-preview-body-cell"
                  >
                    {row?.[j] || ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Box className="excel-preview-container">
        <Box className="excel-preview-empty-state">
          <CircularProgress />
          <Typography variant="body1" className="excel-preview-loading-text">
            Loading preview...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!processedFileBase64 || sheetNames.length === 0) {
    return (
      <Box className="excel-preview-container">
        <Box className="excel-preview-empty-state">
          <Typography variant="h6" className="excel-preview-empty-state-title">
            No file to preview
          </Typography>
          <Typography variant="body2" className="excel-preview-empty-state-text">
            Process an Excel file through the chat to see the preview here
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="excel-preview-container">
      <Box className="excel-preview-content">
        <Typography variant="h5" className="excel-preview-title">
          Processed Excel Preview
        </Typography>

        {sheetNames.length > 1 && (
          <Box className="excel-preview-tabs-container">
            <Tabs
              value={activeSheet}
              onChange={(e, newValue) => setActiveSheet(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {sheetNames.map((name, index) => (
                <Tab key={index} label={name} className="excel-preview-tab" />
              ))}
            </Tabs>
          </Box>
        )}

        {renderTable(previewData[sheetNames[activeSheet]] || [])}
      </Box>
    </Box>
  );
}

