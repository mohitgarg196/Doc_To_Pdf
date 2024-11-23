const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const PDFDocument = require("pdfkit");
// const qpdf = require("qpdf");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Using multer for uploading files
const upload = multer({ dest: "uploads/" });

const outputDir = path.join(__dirname, "converted");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

app.use("/files", express.static(outputDir));
// Serve static files from the "views" directory
app.use(express.static(path.join(__dirname, 'views')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views/index.html"));
});

app.post("/convert", upload.single("docxFile"), async (req, res) => {
    const uploadedFile = req.file;
    const password = req.body.password;

    if (!uploadedFile) {
        return res.status(400).send("No file uploaded!");
    }

    const docxPath = uploadedFile.path;
    const tempPdfPath = path.join(outputDir, `${path.parse(uploadedFile.originalname).name}_temp.pdf`);
    const finalPdfPath = path.join(outputDir, `${path.parse(uploadedFile.originalname).name}.pdf`);

    try {
        const result = await mammoth.extractRawText({ path: docxPath });

        // Create a PDF document
        const pdfDoc = new PDFDocument();
        const writeStream = fs.createWriteStream(tempPdfPath);

        pdfDoc.pipe(writeStream);
        pdfDoc.text(result.value);
        pdfDoc.end();

        writeStream.on("finish", async () => {
            try {
                if (password) {
                    // Use qpdf via child_process to add password protection
                    const command = `qpdf "${tempPdfPath}" --password=${password || "default_password"} --encrypt ${password || "default_password"} ${password || "default_password"} 256 -- "${finalPdfPath}"`;
                    
                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            res.status(500).send("Error securing the PDF.");
                            return;
                        }
                        console.log(`stdout: ${stdout}`);
                        console.error(`stderr: ${stderr}`);

                        // Removing temporary PDF
                        fs.unlinkSync(tempPdfPath);

                        // Redirect to the view page
                        res.redirect(`/view?file=${encodeURIComponent(path.basename(finalPdfPath))}`);
                    });
                } else {
                    // If no password is provided
                    fs.renameSync(tempPdfPath, finalPdfPath);
                    // Redirect to the view page
                    res.redirect(`/view?file=${encodeURIComponent(path.basename(finalPdfPath))}`);
                }
            } catch (err) {
                console.error("Error adding password protection:", err);
                res.status(500).send("Error securing the PDF.");
            }
        });
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).send("An error occurred while processing the file.");
    }
});

// PDF Preview and Download Page
app.get("/view", (req, res) => {
    const fileName = req.query.file;

    if (!fileName) {
        return res.status(400).send("File not specified.");
    }

    const filePath = path.join(outputDir, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found.");
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>View PDF</title>
      <style>
      body{
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #f4f4f9;
      color: #333;
      }

      h1 {
      margin: 20px 0;
      font-size: 2rem;
      color: #007bff;
      text-align: center;
    }
        iframe {
          width: 80%;
          height: 78vh;
          border: 1px solid #ccc;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: #fff;
        }
        .download-btn {
          display: inline-block;
      margin: 10px 0 0 0;
      padding: 10px 20px;
      background-color: #007bff;
      color: #fff;
      border: none;
      border-radius: 5px;
      text-decoration: none;
      font-size: 16px;
      transition: background-color 0.3s, transform 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .download-btn:hover {
          background-color: #0056b3;
      transform: translateY(-2px);
        }

        h1{
        text-align: center;
        font-size: 1.5rem;
        }
      </style>
    </head>
    <body>
      <h1>View Your Converted PDF</h1>
      <iframe src="/files/${fileName}" frameborder="0"></iframe>
      <br>
      <a href="/files/${fileName}" class="download-btn" download>Download PDF</a>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});