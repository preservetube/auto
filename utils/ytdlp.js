const child_process = require('child_process')
const logger = require('./logger.js')

async function downloadVideo(url) {
    return new Promise((resolve, reject) => {
        const child = child_process.spawn("../yt-dlp", [url, ' -f 248+250/22/18/17'], {cwd: 'videos', shell: false})
        
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