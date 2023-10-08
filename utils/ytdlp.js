const child_process = require('child_process')
const logger = require('./logger.js')

async function downloadVideo(url) {
    return new Promise((resolve, reject) => {
        const child = child_process.spawn("../yt-dlp", ["--proxy", "socks5://gluetun:1080", url], {cwd: 'videos', shell: false})
        // https://github.com/yt-dlp/yt-dlp/blob/cc8d8441524ec3442d7c0d3f8f33f15b66aa06f3/README.md?plain=1#L1500
        
        child.stdout.on("data", data => {
            const msg = data.toString().trim()
            if (!msg) return 
    
            logger.info({ message: `${url.replace('https://www.youtube.com/watch?v=', '')} -> ${msg}` })
        })

        child.on("close", async (code, signal) => {
            if (code == 2) {
                reject({
                    fail: true,
                    message: 'Video file is above 2GB.'
                })
            } else {
                resolve({
                    fail: false
                })
            }
        })
    })
}

module.exports = { downloadVideo }