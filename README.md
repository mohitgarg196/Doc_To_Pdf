**HOME PAGE**
![image](https://github.com/user-attachments/assets/557a170b-e979-4a07-87aa-957867015649)

**PREVIEW AND DOWNLOAD PAGE**
![image](https://github.com/user-attachments/assets/c298fa63-fe8a-4062-8cb0-023a7fb90548)
![image](https://github.com/user-attachments/assets/e445c81c-2294-492f-b7f6-6f674ba6848b)
![image](https://github.com/user-attachments/assets/b251d011-4fbf-4388-a0a1-da909d41e431)

**EXCEPTION HANDLING**
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
