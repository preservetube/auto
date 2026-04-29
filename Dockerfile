FROM oven/bun:1 AS base

RUN mkdir -p /usr/src/preservetube/auto
WORKDIR /usr/src/preservetube/auto

COPY . /usr/src/preservetube/auto
RUN bun install

CMD ["bun", "run", "src/index.ts"]