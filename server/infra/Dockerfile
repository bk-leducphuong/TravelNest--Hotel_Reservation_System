ARG ENV_FILE
# Use Node.js as base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

COPY ${ENV_FILE} .env

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]