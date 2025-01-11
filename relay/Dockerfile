# Use the official Node.js 23 image as the base image
FROM node:23-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Copy the rest of the application code to the container  
COPY relay-worker.ts tsconfig.json ./

# Install dependencies
RUN npm config set @mnrgreg:registry=https://npm.pkg.github.com/ 
RUN npm install @mnrgreg/transfer-scheduler-sdk

CMD ["npx", "ts-node", "relay-worker.ts"]