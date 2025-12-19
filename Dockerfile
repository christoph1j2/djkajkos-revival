FROM node:18-alpine

# Install FFmpeg and yt-dlp dependencies
RUN apk add --no-cache ffmpeg python3 py3-pip

# Install yt-dlp (use --pre for latest nightly builds which have newest YouTube fixes)
RUN pip3 install --break-system-packages --upgrade yt-dlp

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build
COPY . .
RUN npm run build

# Update yt-dlp at container start for freshest YouTube fixes
CMD yt-dlp -U; npm start