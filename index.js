const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const { spawn } = require("child_process");
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/generate-embed', (req, res) => {
    const { url, title } = req.body;
    const embedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
        .logo {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: #ffffff;
            border-radius: 12px;
            padding: 5px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
        }
        .logo img {
            height: 24px;
            margin-right: 10px;
        }
        .logo span {
            font-size: 14px;
            color: #333333;
        }
    </style>
</head>
<body>
    <iframe src="${url}" title="${title}"></iframe>

    <div class="logo">
        <img src="https://www.cjoint.com/data/NHsxRKm284Q_embed-2.png" alt="Powered by CC Embed">
        <span>Powered by CC Embed</span>
    </div>
</body>
</html>`;

    const encodedHtml = Buffer.from(embedHtml).toString('base64');
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
    <script>
        document.write(atob('${encodedHtml}'));
    </script>
</body>
</html>`;

    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.html`;
    const filePath = path.join(__dirname, 'public', fileName);

    fs.writeFile(filePath, htmlContent, (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to generate embed file.' });
        }
        return res.json({ success: true, filePath: `/${fileName}` });
    });
});
function startBot() {
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "monitor.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    child.on("close", (codeExit) => {
        console.log(`Bot process exited with code: ${codeExit}`);
        if (codeExit !== 0) {
            setTimeout(startBot, 3000);
        }
    });

    child.on("error", (error) => {
        console.error(`An error occurred starting the bot: ${error}`);
    });
}

startBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
