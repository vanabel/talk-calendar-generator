const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer'); // Add multer for file uploads
const fs = require('fs');
const config = require('./config.js');

const baseURL = config.baseURL;
const port = config.port;

const app = express();

//Define storage for uploaded files and rename them as needed
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // The directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    // Define how files will be named (e.g., a timestamp)
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Use bodyParser to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML form page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/form.html');
});

// Handle the form submission and generate the iCal file
app.post('/generate-ical', upload.single('pdfFile'), (req, res) => {
  const { title, speaker, datetime, venue, affiliation, host, description, remark } = req.body;
  const pdfFile = req.file; // Use req.file to access the uploaded file

  // Convert the datetime string to a JavaScript Date object
  const date = new Date(datetime);

  // Create the iCalendar data
  let icsData = `BEGIN:VCALENDAR
PRODID: -//Van Abel//talk-calendar//EN
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN: VTIMEZONE
TZID: Asia/Shanghai
TZURL:https://www.tzurl.org/zoneinfo-outlook/Asia/Shanghai
X-LIC-LOCATION:Asia/Shanghai
BEGIN:STANDARD
TZNAME:CST
TZOFFSETFROM:+0800
TZOFFSETTO:+0800
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP:${getTimestamp()}
UID:${generateUID()}
DTSTART;TZID=Asia/Shanghai:${formatDate(date)}
DTEND;TZID=Asia/Shanghai:${formatDate(getEndTime(date))}
SUMMARY:${title}
URL:${remark}
DESCRIPTION:Speaker: ${speaker}\\nAffiliation: ${affiliation}\\nHost: ${host}\\nAbstract: ${description}\\n
LOCATION:${venue}
STATUS:CONFIRMED
TRANSP:TRANSPARENT
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${title}
TRIGGER:-PT30M
END:VALARM`;

  // Include the PDF file as an attachment if provided
  if (pdfFile) {
    // Read the file and encode it as base64
    const fileName = pdfFile.filename;
    const fileURL = baseURL + '/uploads/' + fileName;
    // const pdfData = fs.readFileSync(pdfFile.path).toString('base64');
    //icsData += `
//ATTACH;FMTTYPE=application/pdf;ENCODING=BASE64:${pdfData}
//    `;
    const pdfData = fileURL;
    icsData += `
ATTACH:${pdfData}`;
  }
  icsData += `
END:VEVENT
END:VCALENDAR`;

  // Set the filename as `${title}.ics`
  const filename = `${title}.ics`;

  // Save the .ics file with the dynamic filename
  fs.writeFile(filename, icsData, (err) => {
    if (err) {
      res.status(500).send('Error while generating iCal file');
    } else {
      res.download(filename, filename);
    }
  });
});


// Helper function to format the date in the iCalendar format
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// Helper function to get the end time (1 hour later) for the event
function getEndTime(date) {
  const endTime = new Date(date);
  endTime.setHours(endTime.getHours() + 1);
  return endTime;
}

// Helper function to get the current timestamp in the format you provided
function getTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  const hours = now.getUTCHours().toString().padStart(2, '0');
  const minutes = now.getUTCMinutes().toString().padStart(2, '0');
  const seconds = now.getUTCSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Helper function to generate a unique UID for the event
function generateUID() {
  return Date.now() + '-unique-id@example.com';
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

