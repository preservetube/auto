import healthStatus from '@/utils/health';
import { db } from '@/utils/database'
import { getChannelVideos } from './utils/metadata';

let websocket = process.env.WEBSOCKET
if (healthStatus[process.env.METADATA!] != 'healthy') {
  websocket = process.env.ALTERNATIVE_WEBSOCKET!
}

const channels = await db.selectFrom('autodownload')
  .selectAll()
  .execute()

for (const c of channels) {
  console.log(c.channel)
  const videos = await getChannelVideos(c.channel)

  for (const v of videos) {
    console.log(v.videoId)
    const already = await db.selectFrom('videos')
      .selectAll()
      .where('id', '=', v.videoId)
      .executeTakeFirst()

    if (already) continue

    await new Promise(async (resolve, reject) => {
      const ws = new WebSocket(`${websocket}/save?url=http://www.youtube.com/watch?v=${v.videoId}&bKey=${process.env.bKey}`)

      ws.onopen = () => {
        console.log(`opened websocket for ${v.videoId}`)
      }

      ws.onmessage = (event) => {
        const message = event.data
        console.log(message)

        if (message.startsWith('CAPTCHA -')) {
          ws.send('bypass')
        }
      }

      ws.onclose = (event) => {
        console.log('finished archiving\n\n')
        resolve('done')
      }
    })
  }

  await db.updateTable('autodownload')
    .where('channel', '=', c.channel)
    .set('lastCrawled', new Date().toISOString())
    .execute()
}