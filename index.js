const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const { Storage } = require('@google-cloud/storage');

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PORT = 8000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/test", (req, res) => {
  console.log({ req });
  res.send("Hello world");
});

// Specify the path to your service account key file
const keyFilename = './a.json';

const storageClient = new Storage({
  keyFilename,
});

const mergeChunks = async (fileName, totalChunks) => {
  try {
    const bucketName = 'gravita-oasis-lms';
    const chunkDir = __dirname + "/chunks";
    const mergedFilePath = fileName;

    const bucket = storageClient.bucket(bucketName);

    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      await bucket.create();
    }

    const file = bucket.file(mergedFilePath);
    const writeStream = file.createWriteStream();

    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = `${chunkDir}/${fileName}.part_${i}`;
      const chunkBuffer = await fs.readFile(chunkFilePath);
      writeStream.write(chunkBuffer);
      await fs.unlink(chunkFilePath);
    }

    writeStream.end();
    console.log("Chunks merged successfully");
  } catch (error) {
    console.error("Error merging chunks:", error);
    throw error;
  }
};

app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Hit");
  try {
    const chunk = req.file.buffer;
    const chunkNumber = Number(req.body.chunkNumber);
    const totalChunks = Number(req.body.totalChunks);
    const fileName = req.body.originalname;

    const chunkDir = __dirname + "/chunks";

    try {
      await fs.access(chunkDir); // Check if the directory exists
    } catch (err) {
      await fs.mkdir(chunkDir); // Create the directory if it doesn't exist
    }

    const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`;

    await fs.writeFile(chunkFilePath, chunk);
    console.log(`Chunk ${chunkNumber}/${totalChunks} saved`);

    if (chunkNumber === totalChunks - 1) {
      await mergeChunks(fileName, totalChunks);
      console.log("File merged successfully");
    }
    console.log("----------------=========>>>It ended=============>>>>>>");
    res.status(200).json({ message: "Chunk uploaded successfully" });
  } catch (error) {
    console.error("Error saving/uploading chunk:", error);
    res.status(500).json({ error: "Error saving/uploading chunk" });
  }
});
app.get("/makePublic", async (req, res) => {
  try {
    const storage = new Storage({ keyFilename: './a.json' });
    const bucketName = 'gravita-oasis-lms';
    // Get a list of all files in the bucket
    console.log("Reached here")
    const [files] = await storage.bucket(bucketName).getFiles();
    // Make each file public
    await Promise.all(files.map(async file => {
      await file.makePublic();
      console.log(`File ${file.name} is now public.`);
    }));

    console.log('All files in the bucket are now public.');
    res.status(200).json({
      message: "Did public"
    });
  } catch (error) {
    console.error('Error making files public:', error);
    res.status(500).json({
      message: "error"
    });
  }
});
app.listen(PORT, () => {
  console.log(`Port listening on ${PORT}`);
});

///
// Error saving / uploading chunk: TypeError: fs.existsSync is not a functionApiError: The object gravita - oasis - lms / 4 hours Magnificent Views of Earth 4K with Relaxation Music.mp4 exceeded the rate limit for object mutation operations(create, update, and delete).Please reduce your request rate.See https://cloud.google.com/storage/docs/gcs429.
//     at new ApiError(D: \Credentiasla\backend\node_modules\@google - cloud\storage\build\cjs\src\nodejs - common\util.js: 114: 15)
//     at Util.parseHttpRespBody(D: \Credentiasla\backend\node_modules\@google - cloud\storage\build\cjs\src\nodejs - common\util.js: 253: 38)
//     at Util.handleResp(D: \Credentiasla\backend\node_modules\@google - cloud\storage\build\cjs\src\nodejs - common\util.js: 193: 30)      
//     at D: \Credentiasla\backend\node_modules\@google-cloud\storage\build\cjs\src\nodejs - common\util.js: 583: 22
//     at onResponse(D: \Credentiasla\backend\node_modules\retry - request\index.js: 248: 7)
//     at D: \Credentiasla\backend\node_modules\teeny - request\build\src\index.js: 157: 17
//     at runMicrotasks(<anonymous>)

// {
//   "filename": "pexels-marko-zoric-19357432 (Original).mp4",
//     "filesize": 67191209,
//       "md5": "33440245975e96d09bc1162c01528b03",
//         "playback": "https:\/\/s11.api.videocandy.com\/605842b2135dac28\/1702546761569-pexels-marko-zoric-19357432%20%28Original%29.mp4",
//           "mediainfo": {
//     "is_video": true,
//       "is_playable": false,
//         "has_audio": true,
//           "format": "mp4",
//             "duration": 40.14,
//               "bitrate": null,
//                 "width": 3840,
//                   "height": 2160,
//                     "filesize": 67213721,
//                       "framerate": 29.97
//   },
//   "poster": "https:\/\/s11.api.videocandy.com\/605842b2135dac28\/1702546761569-pexels-marko-zoric-19357432%20%28Original%29_poster.jpg"
// }