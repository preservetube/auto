const fetch = require('node-fetch')

async function getInstance() {
    const instances = await (await fetch('https://api.invidious.io/instances.json?pretty=1')).json()
    const sorted = instances.filter(o => o[1].type == 'https')
    return `https://${sorted[Math.floor(Math.random() * sorted.length)][0]}`
}

async function getPipedInstance() {
    const instances = await (await fetch('https://piped-instances.kavin.rocks/')).json()
    return (instances[Math.floor(Math.random() * instances.length)]).api_url
}

async function getVideoMetadata(id) {
    const instance = await getInstance()
    const json = await (await fetch(`${instance}/api/v1/videos/${id}?fields=videoId,title,descriptionHtml,videoThumbnails,published,authorId&pretty=1`)).json()
    return json
}

async function getChannel(id) {
    const instance = await getInstance()
    const json = await (await fetch(`${instance}/api/v1/channels/${id}?pretty=1`)).json()
    return json
}

async function getChannelVideos(id) {
    return new Promise(async (resolve, reject) => {
        try {
            const videos = []
            const instance = await getPipedInstance()
            const json = await (await fetch(`${instance}/channel/${id}`)).json()
            videos.push(...json.relatedStreams)
            if (json.nextpage) await getNextPage(json.nextpage)
            else resolve(videos)
            
            async function getNextPage(payload) {
                const page = await (await fetch(`${instance}/nextpage/channel/${id}?nextpage=${encodeURIComponent(payload)}`)).json()
                videos.push(...page.relatedStreams)

                if (videos.length >= 120) resolve(videos)
                if (page.nextpage) await getNextPage(page.nextpage)
                else resolve(videos)
            }

        } catch (e) {
            resolve(false)
        }
    })
}

async function getPlaylistVideos(id) {
    const instance = await getPipedInstance()
    const json = await (await fetch(`${instance}/playlists/${id}`)).json()
    return json
}

module.exports = { getInstance, getVideoMetadata, getChannel, getChannelVideos, getPlaylistVideos }