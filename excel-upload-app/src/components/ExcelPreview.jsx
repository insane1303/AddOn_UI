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
import { styled } from "@mui/material/styles";

const PreviewContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  backgroundColor: "#f5f5f5",
  display: "flex",
  flexDirection: "column",
  padding: "24px",
}));

const PreviewContent = styled(Box)(({ theme }) => ({
  flex: 1,
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  padding: "24px",
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#6c757d",
}));

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
        sx={{
          height: "calc(100vh - 200px)",
          overflow: "auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "fixed",
            width: "100%",
          }}
        >
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
                    zIndex: 1,
                    width: `${100 / maxCols}%`,
                    minWidth: 100,
                  }}
                >
                  {col || `Column ${i + 1}`}
                </TableCell>
              ))}
              {Array.from({
                length: Math.max(0, maxCols - (data[0]?.length || 0)),
              }).map((_, i) => (
                <TableCell
                  key={`empty-${i}`}
                  sx={{
                    fontWeight: "bold",
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    width: `${100 / maxCols}%`,
                    minWidth: 100,
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
                  <TableCell
                    key={j}
                    sx={{
                      width: `${100 / maxCols}%`,
                      minWidth: 100,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
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
      <PreviewContainer>
        <EmptyState>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading preview...
          </Typography>
        </EmptyState>
      </PreviewContainer>
    );
  }

  if (!processedFileBase64 || sheetNames.length === 0) {
    return (
      <PreviewContainer>
        <EmptyState>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No file to preview
          </Typography>
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Process an Excel file through the chat to see the preview here
          </Typography>
        </EmptyState>
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer>
      <PreviewContent>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: "#213547" }}>
          Processed Excel Preview
        </Typography>

        {sheetNames.length > 1 && (
          <Box
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: "divider",
              width: "100%",
            }}
          >
            <Tabs
              value={activeSheet}
              onChange={(e, newValue) => setActiveSheet(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {sheetNames.map((name, index) => (
                <Tab key={index} label={name} sx={{ textTransform: "none" }} />
              ))}
            </Tabs>
          </Box>
        )}

        {renderTable(previewData[sheetNames[activeSheet]] || [])}
      </PreviewContent>
    </PreviewContainer>
  );
}

