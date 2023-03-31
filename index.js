require('dotenv').config()

const fs = require('node:fs')
const BQueue = require('bee-queue')

const upload = require('./utils/upload.js')
const ytdlp = require('./utils/ytdlp.js')
const redis = require('./utils/redis.js')

const metadata = require('./utils/metadata.js')
const database = require('./utils/database.js')
const logger = require("./utils/logger.js")

const { PrismaClient } =  require('@prisma/client')
const prisma = new PrismaClient()

const queue = new BQueue('download', {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASS,
    },
    removeOnFailure: true,
    removeOnSuccess: true,
    storeJobs: false
})

async function check() {
    const channels = await prisma.autodownload.findMany()

    for (c of channels) {
        if (await redis.get(c.channel)) {
            logger.info({ message: `${c.channel} is already being downloaded` })
        } else {
            await redis.set(c.channel, 'downloading')
            await checkChannel(c.channel)
            await redis.del(c.channel)
        }
    }
}

async function checkChannel(channelId) {
    logger.info({ message: `Checking ${channelId} for new videos...` })

    const videos = await metadata.getChannelVideos(channelId)
    if (!videos) return logger.info({ message: `Failed requesting Youtube for ${channelId}` }) 

    videos.forEach(async (video) => {
        const id = video.url.match(/[?&]v=([^&]+)/)[1]

        const already = await prisma.videos.findFirst({
            where: {
                id: id
            }
        })

        if (already) return
        if (await redis.get(id)) {
            logger.info({ message: `Someone is already downloading ${video.title}, ${id}` })
            return
        }

        if (await redis.get(`blacklist:${id}`)) {
            logger.info({ message: `${video.title} is blacklisted from downloading, ${id}` })
            return
        }

        if (video.duration > 7200) {
            logger.info({ message: `${video.title} is longer than 2h, ${id}` })
            return
        }

        await redis.set(id, 'downloading')
        logger.info({ message: `Added ${video.title} to the queue, ${id}` })

        queue.createJob({ video, id }).save()
    })
}

queue.process(5, async function (job, done) {
    const { video, id } = job.data

    logger.info({ message: `Starting to download ${video.title}, ${id}` })

    const download = await ytdlp.downloadVideo('https://www.youtube.com' + video.url)
    if (download.fail) {
        logger.info({ message: `Failed downloading ${video.title}, ${id} -> ${download.message}` })
        await redis.del(id)
        return done()
    } else {
        const file = fs.readdirSync("./videos").find(f => f.includes(id))
        if (file) {
            fs.renameSync(`./videos/${file}`, `./videos/${id}.webm`)
            logger.info({ message: `Downloaded ${video.title}, ${id}` })

            const videoUrl = await upload.uploadVideo(`./videos/${id}.webm`)
            logger.info({ message: `Uploaded ${video.title}, ${id}` })
            fs.unlinkSync(`./videos/${id}.webm`)

            await database.createDatabaseVideo(id, videoUrl)
            await redis.del(id)
        } else {
            await redis.set(`blacklist:${id}`, 'error')
            logger.info({ message: `Couldn't find file for ${video.title}, ${id}` })
            return done()
        }
    }
})

setInterval(() => {
    check()
}, 300000)