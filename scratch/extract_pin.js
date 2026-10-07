const fs = require("fs");

try {
  const file = "C:\\Users\\ELITEBOOK\\.gemini\\antigravity-ide\\brain\\edcb5f09-b6a6-4d66-8e82-a3e4ac73c65b\\.system_generated\\steps\\2102\\content.md";
  const content = fs.readFileSync(file, "utf8");
  
  // Find all urls
  const urlRegex = /https:\/\/[^\s"'<>]+/g;
  const urls = content.match(urlRegex) || [];
  
  const videoUrls = urls.filter(u => u.includes(".mp4") || u.includes(".m3u8") || u.includes("video") || u.includes("v.pinimg"));
  console.log("Found video URLs:", videoUrls);

  // Search JSON data blocks
  const scriptTags = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scriptTags) {
    if (s.includes("151785449937901238") || s.includes("videos") || s.includes("story_pin_data") || s.includes("video_list")) {
      const vidMatches = s.match(/https:\/\/[^"'\s\\]+v\.pinimg\.com[^"'\s\\]+/gi) || [];
      if (vidMatches.length) {
        console.log("Script matches:", vidMatches);
      }
    }
  }
} catch (e) {
  console.error(e);
}
