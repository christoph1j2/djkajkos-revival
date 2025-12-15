FROM node:18-alpine

# Install FFmpeg and yt-dlp dependencies
RUN apk add --no-cache ffmpeg python3 py3-pip
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build
COPY . .
RUN npm run build

# Start the bot
CMD ["npm", "start"]