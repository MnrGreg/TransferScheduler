# Use the official Node.js 23 image as the base image
FROM node:23-alpine

ARG GITHUB_TOKEN

# Set the working directory inside the container
WORKDIR /app

# Copy the rest of the application code to the container  
COPY package.json package-lock.json relay-worker.ts tsconfig.json ./

# Install dependencies
RUN npm config set @mnrgreg:registry=https://npm.pkg.github.com/ 
RUN npm config set //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
RUN npm install @mnrgreg/transfer-scheduler-sdk

CMD ["npx", "ts-node", "relay-worker.ts"]