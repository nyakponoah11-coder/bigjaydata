const https = require("https");
const fs = require("fs");
const path = require("path");

const videoUrl = "https://v1.pinimg.com/videos/iht/expMp4/44/cf/5f/44cf5fd09f44df04518f372ae7e592bd_540w.mp4";
const dest = path.join(__dirname, "../public/bg-video.mp4");

console.log("Downloading video to:", dest);

const file = fs.createWriteStream(dest);
https.get(videoUrl, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      const stats = fs.statSync(dest);
      console.log("Video downloaded successfully! Size in bytes:", stats.size);
    });
  } else if (response.headers.location) {
    console.log("Redirecting to:", response.headers.location);
    https.get(response.headers.location, (res2) => {
      res2.pipe(file);
      file.on("finish", () => {
        file.close();
        const stats = fs.statSync(dest);
        console.log("Redirected video downloaded successfully! Size in bytes:", stats.size);
      });
    });
  } else {
    console.error("Failed with status:", response.statusCode);
  }
}).on("error", (err) => {
  console.error("Download error:", err);
});
