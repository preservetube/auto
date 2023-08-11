FROM node:alpine

RUN apk add --no-cache python3 

RUN mkdir -p /usr/src/preservetube/auto
WORKDIR /usr/src/preservetube/auto

COPY . /usr/src/preservetube/auto
RUN yarn

RUN wget https://github.com/yt-dlp/yt-dlp/releases/download/2023.07.06/yt-dlp -q
RUN chmod +x yt-dlp

CMD ["node", "index.js"]