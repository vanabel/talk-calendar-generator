const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer'); // Add multer for file uploads
const fs = require('fs');
const config = require('./config.js');

const baseURL = config.baseURL;
const port = config.port;

const app = express();

// Define EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', __dirname);

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
  const currentDate = new Date();
  const defaultEndDate = getEndTime(currentDate);
  res.render('form', { title: "Talk Calendar Generator", currentTime: getCurrentTime(currentDate), endTime: getCurrentTime(defaultEndDate) });
  console.log(getCurrentTime(currentDate));
});

// Handle the form submission and generate the iCal file
app.post('/generate-ical', upload.single('pdfFile'), (req, res) => {
  const { title, speaker, starttime, endtime, venue, affiliation, host, description, remark } = req.body;
  const pdfFile = req.file; // Use req.file to access the uploaded file

  // Convert the datetime string to a JavaScript Date object
  const startDate = new Date(starttime);
  const endDate = new Date(endtime);
  startDate.setTime( startDate.getTime() - startDate.getTimezoneOffset()*60*1000 );
  endDate.setTime( endDate.getTime() - endDate.getTimezoneOffset()*60*1000 );
  console.log(formatDate(startDate));
  console.log(formatDate(endDate));

  // Create the iCalendar data
  let icsPre =`BEGIN:VCALENDAR
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
END:VTIMEZONE`;

  let icsData = `BEGIN:VEVENT
DTSTAMP:${getTimestamp()}
UID:${generateUID()}
DTSTART;TZID=Asia/Shanghai:${formatDate(startDate)}
DTEND;TZID=Asia/Shanghai:${formatDate(endDate)}
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
  icsData += `END:VEVENT`;
  let icsPost =`END:VCALENDAR`;

  // Set the filename as `${title}.ics`
  const filename = `${title}.ics`;

  // Save the .ics file with the dynamic filename
  fs.writeFile(filename, icsPre + icsData + icsPost, (err) => {
    if (err) {
      res.status(500).send('Error while generating iCal file');
    } else {
      res.download(filename, filename, (err) => {
	if (err) {
	  console.error('Error while sending the file for download:', err);
	} else {
	  // The file has been successfully downloaded, so it's safe to delete it.
	  fs.unlink(filename, (err) => {
	    if (err) {
	      console.error('Error deleting the temporary iCal file:', err);
	    }
	  });
	}
      });
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

function getCurrentTime(date) {
  const currentDate = new Date(date);
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is 0-based, so add 1 and format.
  const currentDay = String(currentDate.getDate()).padStart(2, '0');
  const currentHour = String(currentDate.getHours()).padStart(2, '0');
  const currentMinute = String(currentDate.getMinutes()).padStart(2, '0');
  return  `${currentYear}-${currentMonth}-${currentDay}T${currentHour}:${currentMinute}`;
}

// Helper function to generate a unique UID for the event
function generateUID() {
  return Date.now() + '-unique-id@example.com';
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

