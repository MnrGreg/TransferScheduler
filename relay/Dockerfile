# Use the official Node.js 18 image as the base image
FROM node:18-alpine

ENV RPC_URL=wss://ethereum-sepolia-rpc.publicnode.com

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Copy the rest of the application code to the container  
COPY transfer-scheduler-sdk-1.0.0.tgz relay-worker.ts tsconfig.json ./

# Install dependencies
RUN npm install transfer-scheduler-sdk-1.0.0.tgz

CMD ["npx", "ts-node", "relay-worker.ts"]