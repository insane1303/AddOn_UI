import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // important for base64

app.post("/api/processExcel", (req, res) => {
  const { fileData } = req.body;

  // simulate processing (here just echoing same data back)
  const processedFile = fileData;

  res.json({ processedFile });
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
