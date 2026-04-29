import { Innertube } from 'youtubei.js'
import healthStatus from '@/utils/health';
import { db } from '@/utils/database'

let websocket = process.env.WEBSOCKET
if (healthStatus[process.env.METADATA!] != 'healthy') {
  websocket = process.env.ALTERNATIVE_WEBSOCKET!
}

const yt = await Innertube.create();
const channels = await db.selectFrom('autodownload')
  .selectAll()
  .execute()

for (const c of channels) {
  console.log(c.channel)
  const channel = await yt.getChannel(c.channel);
  const json = await channel.getVideos();

  for (const v of json.videos) {
    console.log(v.video_id)
    const already = await db.selectFrom('videos')
      .selectAll()
      .where('id', '=', v.video_id)
      .executeTakeFirst()

    if (already) continue

    await new Promise(async (resolve, reject) => {
      const ws = new WebSocket(`${websocket}/save?url=http://www.youtube.com/watch?v=${v.video_id}&bKey=${process.env.bKey}`)

      ws.onopen = () => {
        console.log(`opened websocket for ${v.video_id}`)
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